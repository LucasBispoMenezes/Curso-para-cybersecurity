# Módulo 7 — Arquivo, `inode` e o Que Fica Para Trás

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Entender `inode` e por que ele, e não o nome, é o arquivo.
2. Usar `hardlink` para encontrar dado escondido.
3. Reconhecer o resíduo: arquivo removido, `fd` vazado, backup esquecido.
4. Enumerar pontos de montagem e o que cada um expõe.
5. Auditoria de `tmp` previsível e de arquivo temporário inseguro.

---

## ⚠ Antes de começar

⚠ **Este módulo é sobre o que **não aparece na listagem**.** O `ls` mostra o que tem nome. **O
sistema tem muito mais dado do que o `ls` mostra** — em `inode` sem nome, em `fd` aberto, em
`/proc`, em backup esquecido.

| O `ls` mostra | O sistema tem também |
|---|---|
| Arquivo com nome | **`inode` sem nome** (hardlink removido) |
| Arquivo no diretório | **Arquivo aberto por processo** (`/proc/<pid>/fd`) |
| Pasta atual | **Snapshot, backup, `.old`, `.bak`** |
| Ponto de montagem nominal | **O que está por baixo dele** |

⚠ **A tese do módulo:**

> **Um arquivo é um `inode`. O nome é só uma entrada de diretório apontando para ele. Remover o
> nome não remove o dado — enquanto houver um `fd` aberto ou um `hardlink`, o dado está vivo.**

⚠ **E é por isso que auditoria de arquivo em Linux não é `ls`.** É `inode`, `fd`, `mount` e o
resíduo operacional.

---

## 7.1 `inode` — o arquivo é o número, não o nome

⚠ **O `inode` guarda tudo sobre o arquivo, menos o nome.** E o **nome** é uma entrada do diretório
apontando para um número.

```
        DIRETÓRIO /home/user/                INODE 1234567
      ┌──────────────────────┐              ┌──────────────────────┐
      │ nome      → inode    │              │ tipo    : arquivo    │
      │ ──────────────────── │              │ perms   : 640        │
      │ relatorio.txt → 1234567 ────┐       │ dono    : user:user  │
      │ relatorio.bak → 1234567 ────┼──────▶│ tamanho : 4096       │
      │ outro.txt     → 7654321     │       │ blocos  : 8          │
      └──────────────────────┘      │       │ datas   : atime/mtime│
                                    │       │ link count : 2       │
                                    └──────▶│ ponteiros de bloco   │
                                            └──────────────────────┘
        ⚠ DOIS nomes, UM conteúdo, UM inode
```

```bash
mkdir -p ~/lab/mod07 && cd ~/lab/mod07

echo "═══ 1. o inode de cada arquivo ═══"
echo "conteudo original" > original.txt
cp original.txt copia-real.txt
ln original.txt hardlink.txt          # HARDLINK: mesmo inode

echo "  ┌─ nome ──────────────── inode ── links ── tamanho ─┐"
ls -li original.txt copia-real.txt hardlink.txt | \
    awk '{printf "  │ %-22s %-8s %-7s %-8s │\n", $NF, $1, $3, $5}'
echo "  └───────────────────────────────────────────────────┘"

echo
echo "  ⚠ original.txt e hardlink.txt têm o MESMO ÍNODE — são o mesmo arquivo"
echo "  ⚠ copia-real.txt tem inode DIFERENTE — é cópia de dado"
```

⚠ **A tabela é a distinção mais importante do módulo.** `cp` cria **novo `inode`**; `ln` cria
**novo nome para o mesmo `inode`**. E é por isso que `rm` num arquivo com `hardlink` **não apaga o
dado** — só remove **um** nome.

⚠ **E o contador de links é o instrumento.** `stat` mostra `Links: N` — o número de nomes que
apontam para aquele `inode`. Um arquivo com `Links > 1` **tem mais de um nome**, e um deles pode
estar **fora** do diretório onde você olhou.

```bash
echo "═══ 2. o contador de links ═══"
for f in original.txt copia-real.txt hardlink.txt; do
    printf '  %-18s Links=%s  Inode=%s\n' "$f" "$(stat -c %h "$f")" "$(stat -c %i "$f")"
done

echo
echo "═══ 3. alterar por um nome muda no outro ═══"
echo "ALTERADO" >> hardlink.txt
echo "  conteúdo de original.txt: $(cat original.txt)"
echo "  ⚠ uma escrita, dois nomes afetados — é o mesmo inode"

echo
echo "═══ 4. removendo um nome ═══"
rm hardlink.txt
echo "  original.txt ainda existe? $([ -e original.txt ] && echo sim || echo não)"
echo "  Links agora: $(stat -c %h original.txt)"
echo "  ⚠ o dado nunca foi tocado — só um nome saiu"
```

⚠ **O achado de `hardlink` está em três lugares:**

| Situação | O que significa |
|---|---|
| Arquivo do sistema com `Links > 1` fora do esperado | Dado com **nome escondido** |
| Binário com `hardlink` em diretório gravável | ⚠ **Escalação** (o módulo 3) |
| Arquivo de configuração com `hardlink` | Modificação por caminho diferente |
| `setuid` + `hardlink` | Histórico de exploração conhecida |

⚠ **E o terceiro é o mais insidioso.** Um arquivo de configuração com `hardlink` para outro
caminho significa que **editar um edita o outro** — e um backup "separado" pode não ser separado.

```bash
echo "═══ 5. encontrando arquivos com hardlink fora do esperado ═══"
echo "  ⚠ sistemas de arquivo permitem, mas é incomum fora de pacote"
echo

find / -xdev -type f -links +1 2>/dev/null | head -20 | while read -r f; do
    printf '  Links=%s  %s\n' "$(stat -c %h "$f" 2>/dev/null)" "$f"
done
echo "  (fim)"

echo
echo "═══ 6. o inode órfão — arquivo aberto sem nome ═══"
echo "  ⚠ um processo que segura o fd mantém o dado vivo"
echo

cat <<'EXPL'
  O que acontece no rm:
    1. o NOME sai do diretório
    2. o link count cai
    3. se o count chega a 0 E nenhum processo tem fd aberto → o dado é liberado
    4. se ALGUM processo tem fd aberto → o dado CONTINUA

  Como encontrar:
    lsof +L1          → arquivos com link count 0 mas abertos
    lsof | grep deleted
    /proc/*/fd/*      → o caminho de cada fd
EXPL

echo
echo "  procurando arquivos deletados ainda abertos:"
if command -v lsof >/dev/null; then
    sudo lsof +L1 2>/dev/null | head -15 || echo "  (nenhum, ou requer sudo)"
else
    echo "  lsof não instalado — instale com: sudo apt install lsof"
fi
```

⚠ **A seção 6 é o achado que mais aparece em servidor real.** Um serviço que mantém arquivo aberto
depois de removido **continua lendo e escrevendo** — e o dado **não está no disco como arquivo**.
**É como uma configuração "apagada" continua em uso**, e é como um log removido continua sendo
escrito.

⚠ **E é mecanismo de persistência.** Um processo que segura o `fd` de um arquivo removido tem o
conteúdo dele na memória do kernel — **e pode reescrevê-lo depois.**

**Produza `inode.md`:**

| Arquivo | Inode | Links | Mesmo conteúdo? |
|---|---|---|---|
| `original.txt` | | | |
| `copia-real.txt` | | | |
| `hardlink.txt` | | | |

**Responda:**

1. **Quais arquivos compartilham inode?** Por quê?
2. `cp` e `ln` — qual cria inode novo?
3. **Quantos arquivos com `Links > 1`** você encontrou fora do esperado?
4. **Por que `rm` num arquivo com `fd` aberto não libera o dado?**

---

## 7.2 O `fd` como caminho — o dado fora do disco

⚠ **`/proc/<pid>/fd/N` é um **caminho** para o dado, mesmo que o arquivo não exista mais.**

```bash
echo "═══ 1. demonstrando o resíduo ═══"
cd ~/lab/mod07

# Um processo que segura o fd
cat > segura-fd.sh <<'SCRIPT'
#!/usr/bin/env bash
ARQ="$1"
exec 3< "$ARQ"        # abre no fd 3
rm -f "$ARQ"          # remove do disco
echo "  arquivo removido: $ARQ"
echo "  fd 3 ainda aponta para: $(readlink /proc/self/fd/3)"
echo "  mas /proc/self/fd/3 ainda é legível:"
echo "    conteúdo: $(cat <&3)"
sleep 60
SCRIPT
chmod +x segura-fd.sh

echo "segredo-no-inode" > /tmp/efemero.txt
./segura-fd.sh /tmp/efemero.txt &
BG=$!
sleep 1

echo
echo "═══ 2. achando pelo /proc ═══"
PID=$(pgrep -f segura-fd.sh | head -1)
[ -n "$PID" ] && {
    echo "  processo: ${PID}"
    echo "  fds:"
    ls -la "/proc/${PID}/fd/" 2>/dev/null | tail -5 | sed 's/^/    /'
    echo
    echo "  o fd 3 resolvido:"
    readlink "/proc/${PID}/fd/3" 2>/dev/null | sed 's/^/    /'
    echo "  e o conteúdo:"
    sudo cat "/proc/${PID}/fd/3" 2>/dev/null | sed 's/^/    /'
}

kill "$BG" 2>/dev/null; pkill -f segura-fd.sh 2>/dev/null
```

⚠ **A linha do `readlink` mostra `(deleted)` no fim.** É o kernel dizendo: **o nome não existe,
mas o dado está aqui.** E o `cat` **funciona** — o dado é acessível por esse caminho.

⚠ **E isso é achado de auditoria em dois sentidos:**

| Situação | Significado |
|---|---|
| Serviço com arquivo removido aberto | Log ou config "apagado" ainda em uso |
| Arquivo sensível com `/proc` como caminho | ⚠ **Dado acessível mesmo após `rm`** |
| Processo com `fd` para `/dev/sda` | ⚠ **Acesso a disco cru** |
| Processo com `fd` para socket | Conexão ativa |

⚠ **A terceira linha é o achado crítico.** Um processo com `fd` aberto em `/dev/sda` **pode ler o
disco inteiro** — incluindo o `/etc/shadow` de qualquer sistema. **É `root` equivalente**, e não
aparece em nenhuma verificação de permissão de arquivo.

```bash
echo "═══ 3. auditoria de fd perigoso ═══"
echo

for pid in $(ls /proc 2>/dev/null | grep '^[0-9]'); do
    [ -d "/proc/${pid}/fd" ] || continue
    for fd in /proc/${pid}/fd/*; do
        [ -e "$fd" ] || continue
        alvo=$(readlink "$fd" 2>/dev/null)
        case "$alvo" in
            /dev/sd*|/dev/nvme*|/dev/vd*|/dev/mem|/dev/kmem|/dev/port)
                printf '  ⚠⚠ CRÍTICO: pid=%s fd=%s → %s\n' "$pid" "$(basename "$fd")" "$alvo" ;;
            /dev/*)
                printf '  ⚠ dispositivo: pid=%s → %s\n' "$pid" "$alvo" ;;
        esac
    done
done 2>/dev/null | head -15
echo "  (fim)"

echo
echo "═══ 4. fd com arquivo removido ═══"
for pid in $(ls /proc 2>/dev/null | grep '^[0-9]'); do
    [ -d "/proc/${pid}/fd" ] || continue
    for fd in /proc/${pid}/fd/*; do
        [ -e "$fd" ] || continue
        alvo=$(readlink "$fd" 2>/dev/null)
        case "$alvo" in
            *"(deleted)"*)
                printf '  ·  pid=%s  %s  →  %s\n' "$pid" "$(basename "$fd")" "$alvo" ;;
        esac
    done
done 2>/dev/null | head -15
echo "  (fim — comum em serviços com log rotacionado)"
```

**Produza `fd-residuo.md`:**

| Situação | Encontrado | Risco | Ação |
|---|---|---|---|
| `fd` para disco cru | | | |
| `fd` para outro dispositivo | | | |
| `fd` com arquivo removido | | | |
| `fd` para socket | | | |

**Responda:**

1. **Algum processo tem `fd` para `/dev/sd*`?** Se sim, é crítico. Por quê?
2. Algum `fd` aponta para arquivo `(deleted)`? **O que isso significa?**
3. Por que `fd` para dispositivo é **pior** que `fd` para arquivo normal?
4. **Como você fecha essa porta?** (Dica: `device cgroup` — módulo 6.)

⚠ **A resposta 4 conecta os módulos.** O controlador `devices` do `cgroup` (módulo 6) existe
**exatamente** para impedir que um processo abra dispositivo. **Sem ele, o `privileged` contêiner
acessa o disco cru.**

---

## 7.3 O que fica para trás — resíduo operacional

⚠ **A categoria que aparece em **toda** auditoria real.** Arquivo de trabalho que ninguém removeu.

| Tipo | Nome típico | Risco |
|---|---|---|
| **Backup** | `*.bak`, `*.old`, `*~`, `*.orig` | ⚠ Dado antigo, às vezes com credencial |
| **Arquivo de editor** | `.*.swp`, `.#*`, `.~lock.*` | Conteúdo do buffer |
| **Arquivo de sistema operacional** | `.DS_Store`, `Thumbs.db` | Listagem de diretório |
| **Log rotacionado esquecido** | `*.log.1`, `*.gz` | Dado que devia ter saído |
| **Diretório de build** | `node_modules`, `.venv`, `target/` | Código e credencial de build |
| **Arquivo de configuração de exemplo** | `.env.example`, `config.sample` | ⚠ estruturas, às vezes com valor real |
| **Dump** | `core`, `*.dump`, `*.sql`, `*.tar.gz` | ⚠ **Dado inteiro** |
| **Script de migração** | `migrate.sh`, `setup.sql` | Credencial em texto |

```bash
echo "═══ 1. caça ao resíduo ═══"
echo

echo "── backups e cópias ──"
find / -xdev -type f \( -name '*.bak' -o -name '*.old' -o -name '*.orig' \
     -o -name '*~' -o -name '*.save' -o -name '*.swp' -o -name '*.swo' \) 2>/dev/null | \
    head -20 | sed 's/^/  /'
echo "  (fim)"

echo
echo "── arquivos de outros sistemas ──"
find / -xdev -type f \( -name '.DS_Store' -o -name 'Thumbs.db' -o -name 'desktop.ini' \) 2>/dev/null | \
    head -10 | sed 's/^/  /'
echo "  (fim)"

echo
echo "── dumps e arquivos grandes ──"
find / -xdev -type f \( -name 'core' -o -name 'core.*' -o -name '*.dump' \
     -o -name '*.sql' -o -name '*.sql.gz' -o -name '*.tar.gz' -o -name '*.tgz' \) \
     -size +1M 2>/dev/null | head -15 | sed 's/^/  /'
echo "  (fim)"

echo
echo "── arquivo de configuração de exemplo ──"
find / -xdev -type f \( -name '.env*' -o -name '*.sample' -o -name '*.example' \
     -o -name '*.dist' -o -name '*config.bak' \) 2>/dev/null | head -15 | sed 's/^/  /'
echo "  (fim)"
```

⚠ **A categoria `.env` merece atenção máxima.** Um `.env` real é achado crítico; um `.env.example`
é **normal e positivo** (documenta sem expor). **A auditoria precisa distinguir os dois** — e é
isso que separa relatório bom de alarme falso.

```bash
echo "═══ 2. distinguindo .env REAL de .env.example ═══"
echo
echo "  ── com VALOR (⚠ é real) ──"
find / -xdev -name '.env' -type f 2>/dev/null | while read -r f; do
    if grep -qE '=\s*[^[:space:]#]' "$f" 2>/dev/null; then
        printf '  ⚠ %s\n' "$f"
        grep -cE '^[A-Z_]+=' "$f" 2>/dev/null | xargs printf '      %s variáveis\n'
        grep -oE '^[A-Z_]*(PASS|SECRET|TOKEN|KEY|CRED|API)[A-Z_]*' "$f" 2>/dev/null | \
            head -5 | sed 's/^/      ⚠ /'
    fi
done | head -30
echo "  (fim)"

echo
echo "  ── sem valor (é exemplo — ✓ normal) ──"
find / -xdev \( -name '.env.example' -o -name '*.env.dist' -o -name '.env.sample' \) \
     -type f 2>/dev/null | head -10 | sed 's/^/  ✓ /'
echo "  (fim)"

echo
echo "═══ 3. o teste de permissão ═══"
echo "  ⚠ um .env real DEVE ser 600. Se é 644, todos leem."
find / -xdev -name '.env' -type f 2>/dev/null | while read -r f; do
    p=$(stat -c %a "$f" 2>/dev/null)
    case "$p" in
        600|640) printf '  ✓ %-40s %s\n' "$f" "$p" ;;
        *)       printf '  ⚠ %-40s %s — LEGÍVEL POR OUTROS\n' "$f" "$p" ;;
    esac
done | head -20
echo "  (fim)"
```

⚠ **A seção 3 é o achado acionável.** `.env` com `644` significa que **qualquer usuário do
sistema lê a credencial** — e a correção é **uma linha de `chmod 600`**. **É o tipo de achado que
o cliente corrige no mesmo dia.**

**Produza `residuo.md`:**

| Tipo | Encontrados | Achado relevante | Risco |
|---|---|---|---|
| Backups | | | |
| Editor | | | |
| Sistema operacional | | | |
| Dumps | | | |
| `.env` real | | | |
| `.env` com permissão errada | | | |

**Responda:**

1. **Quantos backups?** Algum com conteúdo sensível?
2. **Diferenciou `.env` real de exemplo?** Quantos reais?
3. Algum `.env` com permissão `644`? **É o achado acionável.**
4. Algum dump grande? **O que ele pode conter?**

⚙ **A resposta 4 merece cuidado.** Um `dump.sql` de 500MB tem **o banco inteiro** — incluindo
tabela de usuário com hash de senha. **É achado crítico**, e a correção é remover (depois de
verificar com o cliente que não é backup ativo).

---

## 7.4 Montagem — o que está por baixo

⚠ **Um ponto de montagem **esconde** o que estava lá antes.** E é um lugar onde dado esquecido
sobrevive.

```bash
echo "═══ 1. o que está montado ═══"
findmnt -rno TARGET,SOURCE,FSTYPE,OPTIONS 2>/dev/null | head -25 | sed 's/^/  /'

echo
echo "═══ 2. opções de montagem que importam para segurança ═══"
echo
for mp in / /tmp /var/tmp /home /var /boot; do
    opts=$(findmnt -n -o OPTIONS --target "$mp" 2>/dev/null)
    [ -z "$opts" ] && continue
    printf '  %-14s %s\n' "$mp" "$opts"

    # as flags que importam
    for flag in nosuid noexec nodev ro; do
        case ",$opts," in
            *",$flag,"*) printf '      ✓ %s\n' "$flag" ;;
            *) printf '      ·  %s AUSENTE\n' "$flag" ;;
        esac
    done
    echo
done
```

### As quatro flags de montagem e o que cada uma impede

| Flag | Impede | Onde aplicar |
|---|---|---|
| **`nosuid`** | Bit `setuid`/`setgid` funciona | `/tmp`, `/home`, `/var/tmp`, dados |
| **`noexec`** | Execução de binário | `/tmp`, `/home`, dados, mídia |
| **`nodev`** | Dispositivo (`/dev/*`) | `/tmp`, `/home`, dados |
| **`ro`** | Escrita | `/usr`, `/boot`, imagem |

⚠ **A tabela é o instrumento mais útil do módulo.** `/tmp` sem `nosuid` significa que um binário
`setuid` colocado lá **funciona** — e é `root`. `/home` sem `noexec` significa que um usuário
executa o que quiser de casa.

⚠ **O cenário real:** um atacante com acesso de usuário consegue gravar em `/tmp` (por definição).
Sem `nosuid`, ele compila um binário `setuid` lá — **e precisa de `root` para aplicar o bit**, o
que já o detém. **Mas** o `nosuid` protege contra o caso em que **outro** caminho já deu o bit —
por exemplo, um `mount --bind`, ou um `setcap`.

⚠ **E `noexec` em `/tmp` é o mais eficaz contra "baixar e executar"** — o passo padrão de qualquer
cadeia de exploração. **Sem `noexec`, baixar e rodar é trivial.**

```bash
echo "═══ 3. o cenário que as flags impedem ═══"
cat <<'EXPL'
  SEM nosuid no /tmp:
    - binário setuid colocado em /tmp funciona
    - ⚠ também: um bind-mount de /tmp/suid em outro lugar preserva o setuid

  SEM noexec no /tmp:
    - baixar payload e executar direto      ← o passo padrão de exploração
    - script em /tmp executado pelo cron

  SEM nodev no /tmp:
    - mkfifo, mknod em /tmp
    - ⚠ dispositivo criado com mknod pode ser usado

  ⚠ as três juntas no /tmp são o padrão de hardening
EXPL

echo
echo "═══ 4. verificando o /tmp ═══"
opts=$(findmnt -n -o OPTIONS --target /tmp 2>/dev/null)
echo "  /tmp montado com: ${opts:-（é parte do /）}"
echo
for flag in nosuid noexec nodev; do
    case ",$opts," in
        *",$flag,"*) printf '  ✓ %s presente\n' "$flag" ;;
        *) printf '  ⚠ %s AUSENTE\n' "$flag" ;;
    esac
done

echo
echo "   ⚠ se /tmp é parte do / (sem montagem própria),"
echo "      NÃO SE PODE aplicar as flags sem montar /tmp separado."

echo
echo "═══ 5. o que está POR BAIXO de um ponto de montagem ═══"
echo
echo "  quando você monta algo em /mnt, o conteúdo anterior fica"
echo "  ESCONDIDO ali — e é recuperável com 'mount --bind'"
echo
cat <<'EXPL'
  Demonstração (na sua VM):

    sudo mkdir -p /mnt/alvo
    echo "dado escondido" | sudo tee /mnt/alvo/arquivo.txt
    sudo mount -t tmpfs tmpfs /mnt/alvo
    ls /mnt/alvo                        # vazio — tmpfs cobriu

    # revelar o que está por baixo:
    sudo mkdir -p /tmp/revelado
    sudo mount --bind /mnt/alvo /tmp/revelado   # ⚠ ainda mostra o tmpfs
    # para ver o conteúdo ORIGINAL é preciso desmontar:
    sudo umount /mnt/alvo
    ls /mnt/alvo                        # dado escondido está de volta

  ⚠ o resíduo por baixo é real e ninguém verifica.
  ⚠ é como um exfiltrador esconde dado: monta algo por cima.
EXPL
```

⚠ **A seção 5 é a técnica pouco conhecida.** Dado "escondido" por um ponto de montagem é
recuperável — e é **técnica clássica de ocultação**, tanto defensiva (esconder `/boot` real) quanto
ofensiva (esconder dado exfiltrado).

⚠ **E é um bom teste de auditoria:** verificar se cada ponto de montagem tem conteúdo por baixo que
deveria estar visível. **É o tipo de verificação que nenhum scanner faz.**

**Produza `mount.md`:**

| Ponto | `nosuid` | `noexec` | `nodev` | `ro` | Achado |
|---|---|---|---|---|---|
| `/` | | | | | |
| `/tmp` | | | | | |
| `/home` | | | | | |
| `/var` | | | | | |

**Responda:**

1. **Quais flags faltam no `/tmp`?** Qual o risco de cada uma?
2. `/tmp` é montagem própria? **Se não, o que isso impede?**
3. **Por que `noexec` é a defesa contra "baixar e executar"?**
4. O que fica **por baixo** de um ponto de montagem?

---

## 7.5 O `/tmp` previsível — a classe que reaparece

⚠ **`/tmp` é o diretório compartilhado. E é onde a corrida acontece.**

```bash
echo "═══ as três falhas de /tmp ═══"
cat <<'EXPL'
  1. STICKY AUSENTE
       → qualquer usuário apaga arquivo de qualquer outro
       → correção: chmod 1777 /tmp

  2. NOME PREVISÍVEL
       → programa cria /tmp/app.lock com nome fixo
       → atacante pré-cria arquivo com esse nome, ou um SYMLINK
       → quando o programa (root) escreve, escreve no alvo do symlink
       → ⚠ é a falha que permite sobrescrever /etc/shadow

  3. PERMISSÃO LARGA
       → programa cria /tmp/saida.txt com 666
       → outro usuário lê o conteúdo

  ⚠ as três são configuração/programação, não kernel.
EXPL

echo
echo "═══ 1. o estado do /tmp ═══"
stat -c '  %A  %a  %U:%G  %n' /tmp /var/tmp /dev/shm 2>/dev/null

echo
echo "═══ 2. o que protege symlink em /tmp ═══"
for k in fs.protected_symlinks fs.protected_hardlinks fs.protected_fifos fs.protected_regular; do
    printf '  %-28s = %s\n' "$k" "$(sysctl -n "$k" 2>/dev/null || echo '—')"
done

echo
cat <<'EXPL'
  fs.protected_symlinks = 1:
    impede seguir symlink em diretório sticky quando o dono do link
    difere do dono do diretório E do dono do processo
    → ⚠ é a defesa contra o ataque de symlink em /tmp

  fs.protected_hardlinks = 1:
    impede criar hardlink para arquivo que você não é dono e não pode escrever
    → ⚠ impede hardlink para /etc/shadow

  ⚠ se estão em 0, a defesa contra a classe de ataque clássica está DESLIGADA
EXPL
```

⚠ **A defesa contra symlink em `/tmp` é uma linha de `sysctl`.** E o padrão moderno (kernel 4.19+)
**já é 1** — mas em sistema antigo ou container mal configurado, pode ser `0`. **É achado de
configuração, e a correção é `sysctl -w fs.protected_symlinks=1`.**

```bash
echo "═══ 3. demonstrando a corrida de symlink (controlado) ═══"
echo "  ⚠ na SUA VM. Só mostra o mecanismo."
echo

cat > corrida.sh <<'SCRIPT'
#!/usr/bin/env bash
# Mostra o princípio do ataque de symlink, SEM dano.
set -uo pipefail

ALVO="/tmp/alvo-real.txt"
LINK="/tmp/nome-previsivel.txt"

echo "  ── preparação ──"
rm -f "$ALVO" "$LINK"
echo "conteudo legitimo" > "$ALVO"
echo "  alvo real criado: $ALVO"

echo
echo "  ── o 'atacante' cria o symlink ANTES do programa rodar ──"
ln -s "$ALVO" "$LINK"
echo "  symlink criado: $LINK → $(readlink "$LINK")"

echo
echo "  ── o 'programa' escreve num nome previsível ──"
echo "⚠ SOBRESCRITO PELO PROGRAMA" > "$LINK" 2>/dev/null

echo "  alvo real agora contém: $(cat "$ALVO")"
echo
echo "  ⚠ o programa escreveu no alvo do symlink, não no proprio arquivo"
echo "  ⚠ se o programa rodasse como root e o alvo fosse /etc/shadow..."
echo "     ...seria sobrescrita de arquivo sensível"
SCRIPT
chmod +x corrida.sh
./corrida.sh

echo
echo "═══ 4. o que evita isso (além do sysctl) ═══"
cat <<'EXPL'
  No código:
    · mkstemp()        → cria com nome aleatório E com O_EXCL
    · O_NOFOLLOW       → recusa seguir symlink
    · tempo de execução: criar o arquivo ANTES, com permissão 600

  Na configuração:
    · PrivateTmp=yes no systemd   → /tmp PRÓPRIO para o serviço
    · fs.protected_symlinks=1     → defesa no kernel
    · montar /tmp com nosuid,noexec,nodev

  ⚠ PrivateTmp=yes é a correção mais eficaz para serviço —
     o serviço deixa de compartilhar /tmp com o mundo.
EXPL
```

⚠ **A linha `PrivateTmp=yes` é a diretiva que resolve a classe inteira.** Ela dá ao serviço um
`/tmp` **privado**, dentro do namespace de mount (módulo 6). **Ninguém mais pode pré-criar arquivo
lá** — porque o `/tmp` do serviço é outro.

⚠ **É o exemplo perfeito de como os módulos se conectam:** a defesa contra a classe do `/tmp` é
**namespace de mount**, configurado por **uma diretiva de `systemd`**.

**Produza `tmp.md`:**

| Item | Valor | Seguro? | Correção |
|---|---|---|---|
| Sticky em `/tmp` | | | |
| `protected_symlinks` | | | |
| `protected_hardlinks` | | | |
| `noexec` em `/tmp` | | | |
| `PrivateTmp` nos serviços | | | |

**Responda:**

1. **`/tmp` tem sticky?** Quais `sysctl` de proteção estão ligados?
2. Descreva o ataque de symlink em `/tmp` — **o princípio**, sem executar.
3. **Como `PrivateTmp=yes` resolve a classe inteira?**
4. Qual a defesa **no código** além do `sysctl`?

---

## 7.6 LAB — Auditoria de arquivo e resíduo

**Duração:** 120 min

### Passo 1 — `inode` e `fd` (35 min)

```bash
cd ~/lab/mod07

cat > audita-inode.sh <<'SCRIPT'
#!/usr/bin/env bash
# audita-inode.sh — hardlink, fd perigoso e resíduo de inode
set -uo pipefail

echo "═══════════ AUDITORIA DE INODE E FD ═══════════"
echo

echo "── 1. ARQUIVO COM HARDLINK (links > 1) ──"
find / -xdev -type f -links +1 2>/dev/null | head -25 | while read -r f; do
    printf '  Links=%s  %s\n' "$(stat -c %h "$f" 2>/dev/null)" "$f"
done
echo

echo "── 2. BINÁRIO COM HARDLINK (suspeito) ──"
find / -xdev -type f -links +1 \( -perm -u+x -o -perm -4000 \) 2>/dev/null | \
    head -15 | sed 's/^/  ⚠ /'
echo

echo "── 3. FD PARA DISPOSITIVO (CRÍTICO) ──"
for pid in $(ls /proc 2>/dev/null | grep '^[0-9]'); do
    [ -d "/proc/${pid}/fd" ] || continue
    for fd in /proc/${pid}/fd/*; do
        [ -e "$fd" ] || continue
        alvo=$(readlink "$fd" 2>/dev/null)
        case "$alvo" in
            /dev/sd*|/dev/nvme*|/dev/vd*|/dev/mem|/dev/kmem|/dev/port|/dev/kmsg)
                printf '  ⚠⚠ pid=%s  %s  →  %s\n' "$pid" "$(basename "$fd")" "$alvo" ;;
        esac
    done
done 2>/dev/null | head -10
echo

echo "── 4. FD COM ARQUIVO REMOVIDO ──"
for pid in $(ls /proc 2>/dev/null | grep '^[0-9]'); do
    [ -d "/proc/${pid}/fd" ] || continue
    for fd in /proc/${pid}/fd/*; do
        [ -e "$fd" ] || continue
        alvo=$(readlink "$fd" 2>/dev/null)
        case "$alvo" in
            *"(deleted)"*) printf '  ·  pid=%s  %s  →  %s\n' "$pid" "$(basename "$fd")" "${alvo% (deleted)}" ;;
        esac
    done
done 2>/dev/null | head -12
echo

echo "── 5. RESÍDUO NA HOME E EM /VAR ──"
for d in /root /home /var/backups /var/tmp /opt /srv; do
    [ -d "$d" ] || continue
    find "$d" -maxdepth 3 -type f \( -name '*.bak' -o -name '*.old' -o -name '*~' \
        -o -name '*.orig' -o -name '*.sql' -o -name '*.dump' -o -name 'core' \) 2>/dev/null | \
        head -8 | sed "s|^|  [${d}] |"
done
echo

echo "── 6. .ENV REAL vs. EXEMPLO ──"
find / -xdev -name '.env' -type f 2>/dev/null | while read -r f; do
    if grep -qE '^[A-Z_]+=[^[:space:]#]' "$f" 2>/dev/null; then
        p=$(stat -c %a "$f" 2>/dev/null)
        vars=$(grep -cE '^[A-Z_]+=' "$f" 2>/dev/null)
        seg=$(grep -oE '^[A-Z_]*(PASS|SECRET|TOKEN|KEY|CRED)[A-Z_]*' "$f" 2>/dev/null | head -3 | tr '\n' ' ')
        case "$p" in
            600|640) printf '  ⚠ %s  perm=%s  %s vars  segredos: %s\n' "$f" "$p" "$vars" "$seg" ;;
            *)       printf '  ⚠⚠ %s  perm=%s LEGÍVEL ✓ %s vars  segredos: %s\n' "$f" "$p" "$vars" "$seg" ;;
        esac
    fi
done | head -20
echo
echo "  (exemplos — normal:)"
find / -xdev \( -name '.env.example' -o -name '.env.dist' -o -name '.env.sample' \) -type f 2>/dev/null | head -5 | sed 's/^/  ✓ /'

SCRIPT

chmod +x audita-inode.sh
sudo ./audita-inode.sh 2>&1 | tee inode-saida.txt | head -70
```

Produza `auditoria-inode.md`:

| Seção | Achado | Quantidade | Risco |
|---|---|---|---|
| 1 — hardlink | | | |
| 2 — binário com hardlink | | | |
| 3 — `fd` dispositivo | | | |
| 4 — `fd` removido | | | |
| 5 — resíduo | | | |
| 6 — `.env` | | | |

**Responda:**

1. **Quantos arquivos com hardlink?** Algum binário?
2. Algum `fd` para **dispositivo**? **É crítico.**
3. Algum `.env` com permissão `644`? **É acionável.**
4. **Qual seção você não teria pensado** em auditar?

### Passo 2 — Montagem e `/tmp` (35 min)

```bash
cd ~/lab/mod07

cat > audita-mount.sh <<'SCRIPT'
#!/usr/bin/env bash
# audita-mount.sh — flags de montagem, /tmp e sysctl de proteção
set -uo pipefail

echo "═══════════ FLAGS DE MONTAGEM E /TMP ═══════════"
echo

echo "── 1. PONTOS DE MONTAGEM ──"
findmnt -rno TARGET,SOURCE,FSTYPE,OPTIONS 2>/dev/null | head -20 | sed 's/^/  /'
echo

echo "── 2. FLAGS POR PONTO ──"
printf '  %-16s %-8s %-8s %-8s %s\n' "PONTO" "nosuid" "noexec" "nodev" "ro"
printf '  %-16s %-8s %-8s %-8s %s\n' "─────" "──────" "──────" "─────" "──"
for mp in / /tmp /var/tmp /var /home /boot /usr /dev/shm /run; do
    [ -d "$mp" ] || continue
    opts=$(findmnt -n -o OPTIONS --target "$mp" 2>/dev/null)
    [ -z "$opts" ] && continue
    r=""
    for flag in nosuid noexec nodev ro; do
        case ",$opts," in
            *",$flag,"*) r="$r ✓       " ;;
            *) r="$r ·       " ;;
        esac
    done
    printf '  %-16s %s\n' "$mp" "$r"
done
echo

echo "── 3. /tmp: TIPO DE MONTAGEM ──"
if findmnt -n /tmp >/dev/null 2>&1; then
    echo "  ✓ /tmp é montagem própria"
    findmnt -n -o TARGET,SOURCE,FSTYPE,OPTIONS /tmp | sed 's/^/    /'
else
    echo "  ⚠ /tmp faz parte do / — não se pode aplicar flag sem montar separado"
fi
echo

echo "── 4. PERMISSÃO DOS DIRETÓRIOS COMPARTILHADOS ──"
for d in /tmp /var/tmp /dev/shm /run/lock; do
    [ -d "$d" ] || continue
    m=$(stat -c %a "$d")
    case "$m" in
        1777|1770) printf '  ✓ %-14s %s (sticky presente)\n' "$d" "$m" ;;
        777)       printf '  ⚠ %-14s %s SEM STICKY\n' "$d" "$m" ;;
        *)         printf '  ·  %-14s %s\n' "$d" "$m" ;;
    esac
done
echo

echo "── 5. SYSCTL DE PROTEÇÃO ──"
for k in fs.protected_symlinks fs.protected_hardlinks \
         fs.protected_fifos fs.protected_regular fs.suid_dumpable; do
    v=$(sysctl -n "$k" 2>/dev/null)
    case "$v" in
        1) printf '  ✓ %-28s %s\n' "$k" "$v" ;;
        0) printf '  ⚠ %-28s %s — DEFESA DESLIGADA\n' "$k" "$v" ;;
        *) printf '  ·  %-28s %s\n' "$k" "${v:-—}" ;;
    esac
done
echo

echo "── 6. PRIVATETMP NOS SERVIÇOS ──"
count=0
for u in $(systemctl list-units --type=service --state=running --no-pager 2>/dev/null | \
           awk '/\.service/ {print $1}'); do
    systemctl cat "$u" 2>/dev/null | grep -q 'PrivateTmp=yes' && {
        printf '  ✓ %s\n' "$u"; count=$((count+1))
    }
done
[ "$count" = "0" ] && echo "  ⚠ nenhum serviço com PrivateTmp=yes"
echo "  total: ${count}"
SCRIPT

chmod +x audita-mount.sh
sudo ./audita-mount.sh 2>&1 | tee mount-saida.txt
```

Produza `auditoria-mount.md`:

| Ponto | `nosuid` | `noexec` | `nodev` | `ro` | Achado |
|---|---|---|---|---|---|
| | | | | | |

**Responda:**

1. **Quais flags faltam no `/tmp`?** Qual o risco?
2. Os `sysctl` de proteção estão em `1`? **Se não, é achado de configuração.**
3. **Quantos serviços têm `PrivateTmp=yes`?**
4. **Qual a correção mais eficaz** para o serviço? Por quê?

### Passo 3 — Relatório e correção (50 min)

Produza `relatorio-arquivo.md`:

```markdown
# Auditoria de arquivo e resíduo — [host]

## 1. Método e data
## 2. Dimensões
| Dimensão | Verificados | Achados | Críticos |
|---|---|---|---|
| inode / hardlink | | | |
| fd para dispositivo | | | |
| fd removido | | | |
| resíduo | | | |
| .env | | | |
| montagem | | | |
| /tmp | | | |
| sysctl | | | |
| PrivateTmp | | | |

## 3. Achados críticos
| # | Achado | Evidência | Por que importa | Correção |
|---|---|---|---|---|

## 4. Achados médios
## 5. Achados de postura
## 6. O que verifiquei e está correto
## 7. O que NÃO foi verificado
⚠ Mínimo 3:
- conteúdo de arquivo dentro de cada pacote
- pontos de montagem dentro de contêiner
- resíduo em sistema de arquivos de rede (NFS)
```

**As correções, escritas como comando:**

```bash
cat <<'EXPL'
═══ CORREÇÕES — os comandos ═══

1. Binário com hardlink suspeito:
     find / -xdev -type f -links +1 -perm -u+x 2>/dev/null
     # para cada um: verifique se os nomes são esperados
     sudo ls -li /caminho/binario            # veja o inode
     find / -xdev -inum <inode> 2>/dev/null  # acha TODOS os nomes

2. fd para dispositivo (crítico):
     # se for contêiner: adicione o device cgroup
     docker run --device-read-bind ...       # ou use --privileged=false
     # se for serviço: verifique se precisa de acesso a /dev/*

3. .env com permissão errada:
     sudo chmod 600 /caminho/.env
     sudo chown <dono>:<grupo> /caminho/.env

4. Resíduo (backup, dump):
     # ⚠ VERIFIQUE com o cliente antes de remover
     # pode ser backup ativo
     sudo rm /caminho/arquivo.bak

5. /tmp sem sticky:
     sudo chmod 1777 /tmp

6. /tmp sem flags de montagem:
     # edite /etc/fstab e MONTE /tmp separado:
     # tmpfs /tmp tmpfs rw,nosuid,nodev,noexec,size=1G 0 0
     sudo mount -o remount,nosuid,nodev,noexec /tmp

7. sysctl de proteção:
     sudo sysctl -w fs.protected_symlinks=1
     # e persista em /etc/sysctl.d/99-hardening.conf:
     # fs.protected_symlinks=1
     # fs.protected_hardlinks=1
     # fs.protected_fifos=2
     # fs.protected_regular=2

8. PrivateTmp por serviço:
     sudo systemctl edit nome.service
     # [Service]
     #   PrivateTmp=yes
     #   ProtectSystem=strict
     #   ProtectHome=yes
     #   ReadWritePaths=/var/lib/nome

9. suid_dumpable (core dump de setuid):
     sudo sysctl -w fs.suid_dumpable=0

10. Verificar o que está POR BAIXO de um ponto de montagem:
      # faça em janela de manutenção — desmonta e olha
      sudo umount /ponto && ls -la /ponto
      # ⚠ verifique antes se é seguro desmontar
EXPL
```

⚠ **A nota 4 merece ênfase.** Um dump ou backup **pode ser parte do procedimento operacional**.
**Remover sem confirmar é o erro que quebra a operação do cliente.** A recomendação é
`chmod 600` **primeiro**, e remoção só depois de confirmar.

⚠ **E a nota 6 tem uma armadilha real:** montar `/tmp` com `noexec` **quebra** programas que
executam a partir de `/tmp` — instaladores, alguns scripts, e o `.so` descompactado de alguns
aplicativos. **Teste antes.**

**Responda:**

1. **Quantos achados críticos?** Quantos se corrigem com um comando?
2. Qual correção **pode quebrar funcionalidade**? Como você testaria?
3. **Qual achado pode ser parte da operação** (e não se remove sem confirmar)?
4. **O que não foi verificado**, e o que isso significa para a confiança do relatório?

### Critérios de aceitação

- `inode.md` com a comparação de inode entre `cp` e `ln`, e o contador de links.
- Você demonstrou que `rm` num arquivo com `fd` aberto **não libera o dado**.
- `fd-residuo.md` com `fd` para dispositivo e para arquivo removido verificados.
- `residuo.md` com a **distinção entre `.env` real e exemplo**.
- Você identificou `.env` com permissão errada — é o achado acionável.
- `mount.md` com as **quatro flags** por ponto de montagem.
- Você auditou o `/tmp`: sticky, flags, `sysctl` de proteção.
- `tmp.md` com `fs.protected_symlinks` e `fs.protected_hardlinks` verificados.
- Você demonstrou o princípio do ataque de symlink (controlado, na VM).
- `auditoria-mount.md` com a contagem de serviços com `PrivateTmp=yes`.
- `relatorio-arquivo.md` com as **sete** seções e **três itens** na seção 7.
- Cada achado com a **correção em comando**.
- Você marcou **qual achado precisa de confirmação** antes de remover.

---

## Avaliação

1. O que é um `inode`, e por que o arquivo é o número, não o nome?
2. **Qual a diferença entre `cp` e `ln`** em termos de `inode`?
3. O que o contador de links significa? Onde `Links > 1` é achado?
4. **Por que `rm` num arquivo com `fd` aberto não libera o dado?**
5. Como você encontra arquivo removido ainda aberto? Cite dois métodos.
6. **Por que `fd` para `/dev/sda` é crítico?** Como se fecha essa porta?
7. Cite cinco tipos de resíduo operacional e o risco de cada um.
8. **Como distinguir `.env` real de `.env.example`?** Por que a distinção importa?
9. Qual a permissão correta de um `.env` real?
10. Cite as quatro flags de montagem e o que cada uma impede.
11. **Por que `noexec` em `/tmp` é a defesa contra "baixar e executar"?**
12. Por que `/tmp` sem montagem própria não pode receber as flags?
13. Descreva o ataque de symlink em `/tmp` — o princípio.
14. O que `fs.protected_symlinks` faz? E `fs.protected_hardlinks`?
15. **Como `PrivateTmp=yes` resolve a classe do `/tmp` inteira?** Qual módulo isso conecta?
16. O que pode ficar **por baixo** de um ponto de montagem?
17. Qual defesa **no código** evita a corrida de `/tmp`? Cite duas funções.
18. Por que um dump `.sql` grande é achado crítico?
19. **Por que remover resíduo exige confirmação do cliente?**
20. Qual a correção mais eficaz para um serviço e o `/tmp`? Por quê?

---

**Próximo:** [Módulo 8 — Rede do ponto de vista do kernel](modulo-08.md)
