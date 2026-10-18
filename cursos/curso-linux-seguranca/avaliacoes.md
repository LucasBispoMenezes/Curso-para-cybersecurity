# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos onze módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — O sistema como superfície

**1. As seis etapas do boot**

Firmware (Secure Boot) → bootloader (senha do GRUB) → kernel (lockdown, módulo) → initramfs →
init/`systemd` (PID 1) → serviços. **Cada uma decide algo, e o padrão raramente é o mais restrito.**

**2. `init=/bin/sh`**

Porque ele **substitui o processo de init por um shell de `root`, antes de qualquer autenticação**.
Não há senha envolvida. **E a partir dali, editar `/etc/shadow` e criar conta é trivial.** Anula
tudo o que vem depois.

**3. `lockdown=integrity` vs. `confidentiality`**

`integrity` impede **modificar** o kernel (carregar módulo, escrever em `/dev/mem`).
`confidentiality` também impede **ler** dados do kernel — inclusive em memória de kernel.

**4. `running` vs. `installed`**

`running` = o serviço **está ativo agora**. `installed` = o pacote está presente, pode subir por
dependência ou por `socket` unit. **A superfície ativa é `running`; a instalada é risco latente.**

**5. `socket` unit**

O `systemd` **abre a porta** e só então inicia o serviço. Isso significa que **a porta está aberta
mesmo com o serviço parado** — superfície que o inventário por `running` não vê.

**6. Serviço sem `User=`**

Porque o padrão do `systemd` é `root`. **Não é escolha — é ausência de configuração.** E é o achado
mais comum de auditoria de Linux.

**7. `systemd-analyze security`**

Dá uma nota de **0 a 10** por serviço, e **lista exatamente qual diretiva falta**. É auditoria
automatizada do `systemd` — e transforma o `systemd` em instrumento.

**8. Quatro diretivas de `hardening`**

`ProtectSystem=strict` (`/usr` RO) · `NoNewPrivileges=yes` (sem ganhar privilégio) ·
`PrivateTmp=yes` (`/tmp` próprio) · `ProtectKernelTunables=yes` (sem escrever em `/proc/sys`).

**9. Ativa vs. instalada**

**Ativa:** exposta agora, prioridade alta. **Instalada:** latente, prioridade média. **A instalada
importa** porque pode ser ativada por dependência, `socket` unit ou configuração de terceiro.

**10. `0.0.0.0` vs. `127.0.0.1`**

`127.0.0.1` é **só local** — protege por definição. `0.0.0.0` é **em toda interface**, inclusive
as que você não sabia que existiam. Serviço que escuta em `0.0.0.0` sem necessidade é achado.

**11. `setuid` em diretório gravável**

Porque **qualquer usuário substitui o binário** (o diretório é gravável), e ele **roda como
`root`**. **É escalação imediata, por configuração — sem bug de kernel, sem CVE.**

**12. Por que o `lynis` não encontra**

Porque ele verifica **itens conhecidos de configuração**. Crucificar `setuid` com permissão de
diretório é **raciocínio sobre o sistema**, não conferência de checklist. **É a diferença entre
scanner e auditor.**

**13. As oito classes**

Permissão excessiva · privilégio desnecessário · credencial exposta · delegação ampla · isolamento
ausente · caminho não confiável · detecção ausente · superfície desnecessária.

**14. "Configuração é o controle de acesso"**

Porque o kernel decide permissão por configuração (bit, capability, ACL, LSM, namespace), **não por
código**. A maior parte da escalação em Linux **não é bug** — é configuração que deu privilégio.

---

## Módulo 2 — `/proc` e `/sys`

**1. `/proc` não é FS normal**

Não há arquivo em disco — é **interface do kernel**, gerada no `read()`. **Consequência:** o
tamanho é sempre 0, o conteúdo muda a cada leitura, e não se pode comparar hash.

**2. Qual `Uid` o kernel usa**

**O efetivo** (`euid`). Não o real. **É por isso que `setuid` funciona:** o binário tem real = você,
efetivo = `root`, e o kernel decide pelo efetivo.

**3. `setuid` e os quatro `Uid`**

`real` = você · **`efetivo` = dono do binário (`root`)** · `salvo` = `root` (para poder voltar) ·
`fs` = você (para acesso a arquivo, em alguns casos).

**4. `setuid` em script**

Porque o kernel **ignora o bit `setuid` quando o arquivo é um script com `#!`**. É proteção contra
o vetor mais trivial. **Só binário compilado ganha o bit.**

**5. `CapEff`**

Bitmap hexadecimal das capability **ativas**. Privilégio **sem ser `root`** — e por isso mais
difícil de auditar: **não aparece no `ls`, no `find -perm`, nem no `lynis`**.

**6. Três capability perigosas**

`cap_sys_admin` (montagem, namespace, LSM — **é `root`**) · `cap_sys_module` (carregar módulo de
kernel) · `cap_dac_override` (ignorar permissão de arquivo).

**7. Estrutura de uma linha de `maps`**

`endereço-início-endereço-fim` · `permissão (rwxp)` · `offset` · `device` · **`inode`** · `caminho`.

**8. `w` + `x`**

Porque significa que **se alguém escreve ali, o processador executa**. É o requisito de qualquer
exploit de corrupção de memória — controle de fluxo até essa região = execução de código.

**9. `W^X`**

**Write XOR Execute:** a região não pode ter as duas permissões. Corrige-se com `mprotect` para
remover `PROT_WRITE` depois de escrever — ou nunca ter as duas.

**10. `[vdso]`, `[stack]`, `[heap]`**

`[vdso]` = código do kernel mapeado para o processo (acelera syscall, `r-xp`) · `[stack]` = pilha ·
`[heap]` = alocação dinâmica. `[anon]` = memória sem arquivo (é onde o exploit de heap trabalha).

**11. `fd` entrega arquivo removido**

Porque **o dado vive no `inode`, não no nome**. Remover o nome não libera o `inode` enquanto houver
descritor aberto — e `/proc/<pid>/fd/N` **é** um caminho para o `inode`.

**12. `cwd`**

O diretório de trabalho do processo. **Achado quando é gravável** — caminho relativo no processo
vira vetor (classe 6).

**13. Ler `/proc/<pid>/mem` de outro**

(1) **Mesmo `uid`, ou `CAP_SYS_PTRACE`.** (2) **`yama/ptrace_scope`** permitir.

**14. `ptrace_scope`**

`0` = qualquer processo do mesmo uid pode depurar. `1` = só o ancestral. `2` = só com
`CAP_SYS_PTRACE`. `3` = ninguém. **`0` é achado** porque um processo comprometido do seu usuário
lê a memória do seu gerenciador de senha.

**15. `uevent_helper` com caminho**

Porque o kernel **executa aquele programa como `root`** quando um dispositivo é adicionado. Se o
caminho é gravável, qualquer usuário controla o que roda como `root` — **sem bug, sem CVE.**

**16. `core_pattern`**

**Pipe** (`|programa`) faz o kernel **executar o programa** ao gerar core dump. **Diretório
gravável** permite que outro usuário controle o destino. **Relativo** depende do `cwd`. Os três são
achado.

**17. `security/lsm` vazio**

Significa que **nenhum LSM está ativo**. Sem `SELinux`/`AppArmor`, não há controle de acesso
**que restrinja `root`** — e o resto do hardening não cobre isso.

**18. Diagnóstico vs. invasão**

Ler `/proc` do **seu** processo é introspecção — o programa se inspecionando. De **outro**, exige
permissão e é **depuração de processo alheio** — legítima em auditoria autorizada, crime fora dela.

---

## Módulo 3 — Permissão: os doze bits

**1. Os doze bits**

Nove clássicos (dono/grupo/outros × rwx) + três especiais: `setuid` (4000), `setgid` (2000),
sticky (1000).

**2. Qual `Uid` e ordem**

**Efetivo.** A ordem: (1) uid efetivo é o dono? usa bits do dono. (2) gid efetivo é o grupo? usa
bits do grupo. (3) senão, bits de outros. **O primeiro que casa decide.**

**3. Dono muda permissão sem `w`**

Porque **o dono tem controle sobre a permissão**, não só sobre o conteúdo. Um `r--r--r--` seu é
somente-leitura **para o conteúdo** — e você pode `chmod` a qualquer momento.

**4. `s` vs. `S`**

`s` minúsculo = `setuid` **com** execução → **faz efeito**. `S` maiúsculo = `setuid` **sem**
execução → **não faz nada**, porque `setuid` age na execução.

**5. `setgid`**

Em **arquivo:** executa com o **grupo do dono**. Em **diretório:** arquivo novo **herda o grupo
do diretório** (em vez do grupo primário do criador).

**6. Sticky**

Só o **dono do arquivo** (ou o dono do diretório, ou `root`) pode apagar. **Sem sticky em `/tmp`**,
qualquer usuário apaga arquivo de qualquer outro — e a classe de ataque do `/tmp` funciona.

**7. `setuid` em script**

Porque o **kernel ignora** o bit em arquivo que começa com `#!`. Só binário compilado ganha o
efeito.

**8. `0666 & ~0022`**

```
0666 = 110 110 110
0022 = 000 010 010  (bits a REMOVER)
──────────────────
0644 = 110 100 100
```
A operação é **por bit**, não aritmética.

**9. `umask` no `ls`**

Porque é **estado do processo**, não atributo de arquivo. Verifica-se no `systemd` (`UMask=`), no
`~/.profile`, no `/etc/profile`, ou em `/proc/<pid>/status` (indiretamente, pela permissão dos
arquivos que o processo cria).

**10. Auditoria de `setuid` em cinco passos**

(1) dono é `root`? (2) bit de execução presente (`s` vs. `S`)? (3) está em caminho do sistema?
(4) é de pacote (`dpkg -S`)? (5) a distribuição já o traz?

**11. "Não é de pacote"**

Porque significa que **alguém o colocou ali**, rodando como `root`. **É a assinatura de
persistência** — ou de instalação manual que ninguém documentou. Nos dois casos, achado grave.

**12. Máscara de ACL**

É o **teto** de permissão para grupo e entradas nomeadas. Uma entrada `rwx` com `mask::r--` dá
**apenas leitura**. `getfacl` sem `-e` mostra a **intenção**; com `-e`, o **efeito**.

**13. ACL padrão**

Herança aplicada a **todo** arquivo criado no diretório, **sem ninguém definir nada no arquivo**.
Difícil de auditar porque **não aparece em nenhuma listagem do arquivo**.

**14. Detectar ACL no `ls`**

O **`+`** na décima posição: `-rw-r-----+`.

**15. Seis formas que `find -perm` não encontra**

ACL · ACL padrão · `umask` do processo · capability · atributo estendido · binário solto.

**16. `chattr +i`**

Deixa o arquivo **imutável** — nem `root` apaga sem remover o atributo. **Achado nos dois
sentidos:** proteção (`/etc/passwd`) ou **persistência** (binário malicioso que resiste à remoção).

**17. `/etc/shadow`**

`640 root:shadow`. Compare: `/etc/passwd` é `644 root:root` **de propósito** — é feito para ser
lido. **Saber o esperado é metade da auditoria.**

**18. O que o `lynis` não verifica**

`setuid` em diretório gravável · ACL · ACL padrão · `setuid` não-pacote · atributo imutável
suspeito · `umask` do serviço. **Porque ele verifica itens conhecidos, não cruza dimensões.**

---

## Módulo 4 — Usuário e credencial

**1. Campos de `/etc/passwd` e `/etc/shadow`**

`passwd`: nome · senha (`x`) · uid · gid · GECOS · home · shell.
`shadow`: nome · **hash** · último dia de mudança · mínimo · máximo · aviso · inatividade ·
expiração.

**2. Prefixo de hash**

`$1$` MD5 (**obsoleto, quebrável em minutos** com GPU) · `$5$` SHA-256 · `$6$` SHA-512 ·
`$y$` yescrypt · `$2a$/2b$` bcrypt. `!` = bloqueada · `*` = nunca teve senha.

**3. Senha vazia e `nullok`**

Conta com senha vazia **autentica sem senha**. E `nullok` no PAM diz ao `pam_unix` que **senha
vazia é aceitável** — a combinação é **login livre**.

**4. `uid 0`**

Porque **o kernel decide privilégio pelo `uid`, não pelo nome**. Qualquer conta com `uid 0` **é
`root`** — e frequentemente é backdoor ou serviço mal configurado.

**5. Usuário de sistema com shell**

Serviço **não precisa de shell de login**. Ter um significa **mais uma porta** — e frequentemente
significa que a conta foi criada com `useradd` padrão.

**6. Sem expiração**

Significa que **a senha vaza hoje e vale para sempre**. A rotação de credencial nunca acontece.

**7. `real`, `efetivo`, `salvo`, `fs`**

Kernel usa o **efetivo**. `salvo` permite voltar ao efetivo depois de descer. `fs` é usado em
acesso a arquivo em alguns contextos.

**8. `seteuid(getuid())`**

**Desce** o efetivo para o real. Um programa privilegiado faz isso para **executar trabalho sem
privilégio** — e depois volta com `seteuid(0)`, possível por causa do **`salvo`**.

**9. `required`, `requisite`, `sufficient`**

`required`: precisa passar, mas a falha **não para imediatamente** (permite outros módulos).
`requisite`: precisa passar e **para imediatamente**. `sufficient`: se passar, **libera** sem os
seguintes.

**10. `pam_exec` gravável**

Porque ele **executa o programa durante a autenticação** — no contexto de quem autentica,
frequentemente `root`. Se o programa é gravável, **qualquer usuário executa código como `root`**.

**11. `pam_faillock` ausente**

Sem ele, **força bruta de senha não tem limite**. É a forma mais comum de comprometer SSH.

**12. Anatomia de `sudoers`**

`Usuário Host = (RunAs:RunAs) NOPASSWD: Comando`.

**13. `NOPASSWD`**

`NOPASSWD: ALL` é `root` completo sem senha. `NOPASSWD` num comando específico **ainda pode ser**
— se o comando **consegue executar outro**.

**14. Wildcard não restringe**

Porque o comando autorizado **tem opção que executa outro**. `sudo systemctl *` permite
`systemctl link` de unit arbitrário — e a unit executa como `root`. **O wildcard só limita a
string, não o efeito.**

**15. `vim`, `less`, `find`**

`vim` tem `:!sh` · `less` tem `!sh` · `find` tem `-exec sh \;`. **Os três dão shell como `root`** —
e estão no `GTFOBins`.

**16. Cron com caminho relativo**

Porque o cron resolve o nome pelo **`PATH` do cron**. Se um diretório do `PATH` é gravável,
**você controla o comando** — e ele roda como o usuário do crontab (frequentemente `root`).

**17. Grupo `docker` / `disk`**

`docker` permite **montar o sistema de arquivos do host** num contêiner — portanto `root`.
`disk` permite **ler o disco cru** — portanto ler `/etc/shadow` de qualquer sistema.

**18. `polkit` pouco auditado**

Porque é o mecanismo do **desktop**, não do servidor — então a auditoria de servidor não olha. E
regra pode permitir a **usuário ativo localmente** ação administrativa **sem senha**.

**19. Correção de `sudoers`**

`visudo` (valida antes de salvar). **Cuidado: mantenha uma sessão de `root` aberta** — sintaxe
inválida tranca todo o `sudo`.

**20. Vulnerabilidade vs. má config vs. postura**

**Vulnerabilidade:** explorável como está (senha vazia, `NOPASSWD: ALL`).
**Má configuração:** aumenta risco, precisa contexto (hash MD5, sem expiração).
**Postura:** boa prática ausente (sem `pam_faillock`).

---

## Módulo 5 — Capability e `seccomp`

**1. O que capability resolve**

`root` indivisível significava que **precisar de um privilégio dava todos**. Capability divide em
41 pedaços — **o programa ganha só o que precisa**.

**2. Por que `cap_sys_admin` não é granular**

Porque ela dá: montar sistema de arquivos, criar namespace, alterar LSM, ler `/dev/mem`, e uma
dúzia de outras operações administrativas. **É chamada de "the new root" na própria documentação
do kernel.**

**3. Cinco que equivalem a `root`**

`cap_sys_admin` · `cap_sys_module` · `cap_sys_rawio` · `cap_dac_override` · `cap_setuid`
(e `cap_setgid`, `cap_setpcap`).

**4. Os cinco conjuntos**

`CapBnd` (teto) → `CapPrm` (pode ativar) → **`CapEff`** (o que o kernel usa). Mais `CapInh`
(preserva em `exec`) e `CapAmb` (preserva sem privilégio).

**5. Qual o kernel verifica**

**`CapEff`.** O caminho: precisa estar em `CapPrm` para entrar em `CapEff`; e em `CapBnd` para
entrar em `CapPrm`.

**6. `CapBnd`**

O **teto absoluto** — nada acima é alcançável. **Nunca aumenta**, porque é definida no `exec`.

**7. `setuid root` = `CapEff = CapBnd`**

Porque `setuid root` dá **todas** as capability que o teto permite. **É a diferença prática de
`setcap`:** `setuid root` dá o conjunto inteiro, `setcap` dá uma.

**8. `CapAmb` vs. `CapInh`**

`CapInh` é preservado através de `exec` **de binário privilegiado**. `CapAmb` é preservado mesmo
em `exec` **de binário não privilegiado** — permite que a capability **sobreviva** e se espalhe.

**9. Por que o `ls` não mostra**

Porque capability fica em **atributo estendido** (`security.capability`). Só `getcap` e `getfattr`
veem. **Nem `chmod`, nem `find -perm`, nem `ls -la`.**

**10. `find -perm` vs. capability**

`find -perm` lê os **nove/douze bits**. Capability não é bit de permissão — é atributo estendido.
**Cobre metade da superfície de privilégio.**

**11. Três cruzamentos**

`setuid` + capability · capability + diretório gravável · capability + binário não-pacote.

**12. Capability em dir gravável**

Porque a capability é **do arquivo**, não do dono. Se alguém pode escrever, **substitui o binário
e herda a capability**.

**13. `cap_sys_admin` preguiçosa**

Porque **engloba tudo** — então "resolve" qualquer problema. É exatamente por isso que é o achado:
deu `root` quando o programa precisava de uma operação só.

**14. Porta < 1024 e `chroot`**

`cap_net_bind_service` · `cap_sys_chroot`.

**15. `seccomp`**

Filtro de **syscall**. Modo `0` desligado, `1` strict (só read/write/exit/sigreturn — quase
inútil), `2` filter (BPF decide cada syscall — o usado).

**16. Defesa em profundidade**

Porque **não impede a corrupção de memória** — impede o **próximo passo**. Um exploit com controle
de fluxo mas **sem `execve`** tem muito menos utilidade.

**17. `MemoryDenyWriteExecute`**

Força `W^X` (fecha o achado do módulo 2). **Quebra** Java, .NET, Node.js (V8), e qualquer coisa
com compilação em tempo de execução.

**18. `CapabilityBoundingSet`**

Define o **teto** de capability do serviço — o que ele pode ter, no máximo.

**19. Excesso vs. comprometimento**

**Excesso:** configuração feita por tentativa — você corrige com `setcap` menor.
**Comprometimento:** binário desconhecido com capability — **você investiga antes de remover**, e
a origem é o achado.

**20. Testar em produção**

`systemctl edit` (cria override, não edita o original), testar, e `systemctl revert` para reverter.

---

## Módulo 6 — Namespace e `cgroup`

**1. Os oito namespace**

`mnt` · `pid` · `net` · `ipc` · `uts` · **`user`** · `cgroup` · `time`. Ordem histórica: os cinco
primeiros para **empacotamento**, os três últimos (`user`, `cgroup`, `time`) para **segurança**.

**2. Só o `user` muda privilégio**

Porque os outros isolam **visão** — o que o processo vê. O `user` isola **identidade** — e
identidade é o que o kernel usa para decidir permissão.

**3. Visão vs. poder**

`pid` + `mnt` + `net` isolam **o que o processo vê**. Um processo em namespace de PID próprio
**ainda é `root`** — e `root` no namespace é `root` no host, **a menos que `user` esteja ativo**.

**4. Como auditar isolamento**

Comparar os **`inode` de namespace** entre dois processos: `readlink /proc/<pid>/ns/<tipo>`. Se o
número depois de `[` é igual, **compartilham**; se é diferente, **estão isolados**.

**5. `unshare` vs. Docker**

`unshare` faz **namespaces e `chroot`** — as duas primeiras de oito peças. **Não faz:** limite de
`cgroup`, `seccomp`, limite de capability, LSM, rootfs RO, `userns` real, `veth`.

**6. `/etc/shadow` no `user` ns**

Porque o `userns` **mapeia a identidade** — você parece `uid 0` dentro, mas o kernel **ainda sabe**
que você é o seu uid real. **Uma operação só é permitida se o privilégio valer no namespace onde o
recurso vive.**

**7. `net` sozinho**

Porque o namespace de rede novo tem **só loopback, sem endereço**. **É por isso que o Docker cria
`veth` e ponte:** o namespace sozinho não conecta nada.

**8. `nsenter`**

Entra no namespace de outro processo. Exige **`CAP_SYS_ADMIN`**.

**9. Diagnóstico vs. intrusão**

O comando é o mesmo; **a diferença é a autorização**. No namespace de um processo seu, é
diagnóstico. No de um processo alheio, sem autorização, é intrusão.

**10. `cgroup` v1 vs. v2**

v1: **hierarquias separadas** por controlador. v2: **unificado** — um só, com todos os
controladores. v2 é o padrão moderno.

**11. Seis controladores**

`cpu` (tempo) · `cpuset` (núcleos) · `memory` (RAM) · `pids` (processos) · `io` (disco) ·
`devices` (**quais dispositivos**).

**12. `devices` e segurança**

Porque lista **quais dispositivos** o grupo pode abrir. É o que impede um contêiner de abrir
`/dev/sda` — o que seria **`root` imediato** (ler o disco cru).

**13. `pids.max`**

Porque **sem ele um programa cria processos até esgotar o sistema** (fork bomb). É o limite mais
barato de configurar e o mais útil.

**14. As quatro que anulam**

`privileged: true` · **socket do Docker montado** · `cap_add: [SYS_ADMIN]` · `pid: host` +
`network: host`.

**15. Socket do Docker**

Quem controla o socket **cria outro contêiner** — e pode criá-lo **privilegiado**. **É host por
procuração:** não precisa de `privileged` no contêiner atual.

**16. `cap_sys_admin` = `privileged`**

Porque ela dá **montagem, namespace e LSM** — que juntas equivalem ao que `privileged` concede.
**A diferença entre os dois é nomes, não efeito.**

**17. `no-new-privileges`**

Impede o processo de **ganhar privilégio** — via `setuid`, `setgid` ou `setcap`. Fecha o módulo 3
e o módulo 5 dentro do contêiner.

**18. `read_only: true`**

Impede escrever no sistema de arquivos do contêiner. **Impede persistência** — o atacante não
consegue deixar arquivo. Exceção: `tmpfs` para o que precisa escrever.

**19. "Contêiner" não é uma palavra só**

É um **pacote de oito peças:** namespaces · `chroot`/`pivot_root` · limite de `cgroup` · `seccomp` ·
limite de capability · LSM · rootfs RO · `userns` real. **Cada uma é escolha, e a maioria fica no
padrão.**

**20. Um parâmetro**

**`privileged`** — porque **anula todo o resto**. Corrigi-lo é uma linha no `docker run`.

---

## Módulo 7 — Arquivo e resíduo

**1. `inode`**

A estrutura que contém **tudo sobre o arquivo menos o nome**: tipo, permissão, dono, tamanho,
datas, contador de links, ponteiros de bloco. **O nome é entrada de diretório apontando para um
número.**

**2. `cp` vs. `ln`**

`cp` cria **novo `inode`** (cópia de dado). `ln` cria **novo nome para o mesmo `inode`** (hardlink).

**3. Contador de links**

Número de nomes apontando para o `inode`. `Links > 1` significa que **há mais de um nome** — e um
deles pode estar **fora** do diretório onde você olhou.

**4. `rm` com `fd` aberto**

Porque o dado vive no **`inode`**, e o `inode` é liberado só quando **o link count chega a zero E
nenhum processo tem `fd` aberto**. Com `fd`, o dado continua.

**5. Encontrar arquivo removido aberto**

`lsof +L1` · `lsof | grep deleted` · `readlink /proc/*/fd/*` (procura `(deleted)`).

**6. `fd` para `/dev/sda`**

Porque permite **ler o disco cru** — incluindo `/etc/shadow` de qualquer sistema. **Fecha-se com o
controlador `devices` do `cgroup`** (módulo 6), ou removendo `/dev` real com `PrivateDevices=yes`.

**7. Cinco resíduos**

Backup (`*.bak`, `*.sql`) · arquivo de editor (`*.swp`) · arquivo de SO (`.DS_Store`) · diretório
de build (`node_modules`) · **`.env` real**.

**8. `.env` real vs. exemplo**

Real tem `CHAVE=valor`; exemplo tem `CHAVE=` ou `CHAVE=<seu-valor-aqui>`. **A distinção importa
porque `.env.example` é positivo** (documenta sem expor) e **`.env` real é crítico**.

**9. Permissão de `.env`**

`600` (ou `640`). `644` significa que **qualquer usuário do sistema lê a credencial**.

**10. Quatro flags de `mount`**

`nosuid` (bit `setuid` não funciona) · `noexec` (não executa) · `nodev` (sem dispositivo) ·
`ro` (somente leitura).

**11. `noexec` em `/tmp`**

Porque é a defesa contra o passo padrão de qualquer cadeia de exploração: **baixar payload e
executar direto**.

**12. `/tmp` sem montagem própria**

Porque as flags são **por ponto de montagem**. Se `/tmp` faz parte do `/`, aplicar `noexec` daria
`noexec` no `/` inteiro — e você não pode.

**13. Symlink em `/tmp`**

Programa cria arquivo com nome previsível (`/tmp/app.lock`). Atacante cria **symlink** com esse
nome, apontando para alvo sensível. O programa (como `root`) escreve no nome — e escreve **no alvo
do symlink**.

**14. `fs.protected_*`**

`protected_symlinks` impede seguir symlink em diretório sticky quando o dono do link difere do
dono do diretório e do processo. `protected_hardlinks` impede criar hardlink para arquivo que você
não é dono e não pode escrever.

**15. `PrivateTmp`**

Dá ao serviço um **`/tmp` próprio**, dentro do namespace de mount (módulo 6). **Ninguém mais pode
pré-criar arquivo lá** — porque é outro `/tmp`. **Resolve a classe inteira.**

**16. Por baixo do ponto de montagem**

O conteúdo que estava no diretório **antes** da montagem — escondido, e recuperável desmontando.
**É técnica de ocultação**, defensiva e ofensiva.

**17. Defesa no código**

`mkstemp()` (nome aleatório + `O_EXCL`) · `O_NOFOLLOW` (recusa symlink).

**18. `.sql` grande**

Porque tem **o banco inteiro** — incluindo tabela de usuário com hash de senha. **Achado crítico.**

**19. Remover resíduo exige confirmação**

Porque pode ser **parte do procedimento operacional** do cliente. **A recomendação é `chmod 600`
primeiro**, e remoção só depois de confirmar.

**20. Correção mais eficaz para serviço**

`PrivateTmp=yes` — porque resolve a classe **sem tocar no código** e sem quebrar funcionalidade.

---

## Módulo 8 — Rede do ponto de vista do kernel

**1. `/proc/net/tcp`**

Estado dos sockets TCP: endereço local/remoto, **estado**, uid, **inode**, filas. É **por
namespace** — o mesmo arquivo mostra coisas diferentes dentro de um contêiner.

**2. Endereço invertido**

Porque o kernel escreve em **hex little-endian**. `0100007F` → `7F000001` → **127.0.0.1**.
Porta: `0016` → **22**.

**3. Coluna `inode`**

Liga o socket ao **`fd` do processo** (módulo 7): `/proc/<pid>/fd/N → socket:[INODE]`. **É o elo
que responde "qual processo tem esta conexão".**

**4. `uid` do socket**

**Qual usuário criou o socket** — independente de quem mantém o processo hoje. Socket `LISTEN` com
`uid=0` é serviço de `root`.

**5. `CLOSE_WAIT`**

O outro lado fechou e **o programa não fechou**. Muitos é **vazamento de descritor** — bug de
aplicação.

**6. Descobrir qual processo**

Ler `/proc/<pid>/fd/*`, achar `socket:[INODE]`, e procurar o `INODE` em `/proc/net/tcp`.

**7. Sem processo visível**

(1) Socket **do kernel** (NFS, conntrack) — normal. (2) Processo de **outro namespace** (módulo 6).
(3) Processo de **outro usuário** — requer privilégio para ver o `fd`.

**8. `iptables` por namespace**

Porque a tabela de filtro **pertence ao namespace de rede**. Regra num namespace **não vale em
outro**. Consequência: o contêiner tem tabela própria e **o `iptables` do host não o alcança**.

**9. "O firewall bloqueia" pode ser falso**

Porque a regra pode estar **no host**, e o contêiner **não está sujeito a ela** — tem a própria
tabela.

**10. Auditar firewall de contêiner**

`nsenter --target <pid> --net iptables -L -n` — **entrar** no namespace de rede do processo e ler
a tabela dele.

**11. `ACCEPT` na `INPUT`**

Porque significa que **tudo entra, a menos que regra específica negue**. O padrão correto é
`DROP` com regras explícitas de `ACCEPT` — **errar por omissão é o erro perigoso**.

**12. Ausência de `LOG`**

Porque uma regra que bloqueia **sem registrar** não deixa evidência. **Detecção é parte do
controle** — e é o módulo 9.

**13. Cinco coisas na saída**

Destino inesperado · porta incomum · serviço sem motivo para sair · conexão persistente para um
destino (beacon) · DNS para resolvedor estranho.

**14. Porta `:4444`**

Porque é **convenção**, e atacante competente usa `:443`. **A porta não é prova.** O achado é o
**destino que não faz sentido** para o serviço.

**15. Cinco passos da auditoria de saída**

Inventário · baseline (comparar dois momentos) · escopo/allowlist (a quem o serviço
**legitimamente** fala) · resolução (para onde o nome resolve) · intervalo (beacon).

**16. Qual passo exige o quê**

**Escopo exige conhecer o cliente.** **Intervalo exige tempo** — e é onde o C2 aparece.

**17. Valores seguros**

`ip_forward=0` · `accept_redirects=0` · `rp_filter=1`.

**18. `OUTPUT ACCEPT` arriscado**

Porque permite **qualquer saída** — e é por onde a exfiltração ocorre. O correto é **listar os
destinos legítimos e negar o resto**.

**19. O que registrar**

**Registrar:** conexão de entrada negada · saída para destino novo · porta incomum em `LISTEN` ·
mudança em hora de baixo movimento.
**Não registrar:** todo pacote aceito · scan de porta comum.

**20. Log em excesso**

Porque **ninguém lê**. Volume absurdo esconde o sinal — e um log que ninguém lê é igual a não ter
log.

---

## Módulo 9 — Log e detecção

**1. Três camadas**

`journald` (aplicação, binário, indexado) · `rsyslog` (texto em `/var/log`) · **`auditd` (kernel,
syscall)**.

**2. `auditd`**

Único que vê syscall. Responde: quem abriu `/etc/shadow` · quem executou `/usr/bin/passwd` · quando
regra de `iptables` mudou · quem mudou `uid` · qual processo carregou módulo de kernel.

**3. `Storage=volatile`**

Porque **todo log some no reboot** — e um atacante que reinicia **apaga a evidência**.

**4. `SystemMaxUse` ausente**

O journal cresce **sem limite** até encher o disco — e disco cheio é indisponibilidade.

**5. Quatro arquivos de sessão**

`wtmp` (`last`) · `btmp` (`lastb`, falhas) · `lastlog` (`lastlog`) · `utmp` (`who`). **São
binários** — não se lê com `cat`.

**6. Anatomia de regra de `auditd`**

Watch: `-w /caminho -p rwa -k chave`. Syscall: `-a always,exit -F arch=b64 -S nome -F filtro -k
chave`.

**7. `auid` vs. `uid`**

`uid` = quem executa **agora** (é `root` com `sudo`). `auid` = quem **se autenticou originalmente**
(sobrevive ao `sudo`). **O `auid` atribui a ação.**

**8. `ses`**

O **ID da sessão de login** — agrupa **todos** os eventos do mesmo login, permitindo reconstruir o
incidente.

**9. `journald` sozinho**

Porque registra a **mensagem** (`sudo: user : COMMAND=...`), não **o que o comando fez com o
privilégio**. É o casamento com o `auditd` que reconstrói o incidente.

**10. As sete seções**

Credencial · privilégio · capability · **persistência** · kernel · rede · exclusão.

**11. Persistência a mais valiosa**

Porque responde **"como ele sobreviveu ao reboot"** — e é onde o atacante se instala: cron,
`systemd`, `ld.so.preload`, `environment`.

**12. Exclusão**

Porque sem ela o `auditd` registra **milhares de eventos por minuto** de processos de sistema — e
**o log vira ruído**. **Ruído é igual a não ter log.**

**13. Cinco ações sem log**

Ler `/etc/shadow` sem regra · conexão de saída · leitura de arquivo comum · operação dentro de
contêiner · conteúdo do arquivo lido (só o acesso é registrado).

**14. Log de contêiner**

Porque o contêiner tem **namespace de PID e mount** (módulo 6). O `journald` do host **não vê** o
log da aplicação dentro, e o `auditd` do host **não audita syscall dentro** do namespace.

**15. `loginuid = 4294967295`**

**Não definido.** Acontece em processo de kernel, contêiner sem configuração, serviço de sistema.
**A ação desse processo não é atribuível a um usuário.**

**16. `-e 2`**

Torna as regras **imutáveis** até o reboot. Impede o atacante de **remover regra** — e também
impede **você** de mudar regra sem reiniciar.

**17. `rotate` vs. `keep_logs`**

`rotate` **apaga o mais antigo**. `keep_logs` **preserva** até o limite de `num_logs` — **melhor
para investigação**.

**18. Log local e `root`**

Porque `root` tem `truncate`, `rm`, e desativação de serviço. **A única defesa real é o log
remoto** — o atacante precisaria comprometer **dois** hosts.

**19. `queue.saveonshutdown`**

Faz o log **sobreviver à queda** do servidor de destino — a fila é salva em disco.

**20. Registrar vs. detectar**

**Registrar:** guardar evento (fácil, volume alto). **Detectar:** perceber o evento relevante
(difícil, sinal). **Sem detecção, o log existe e ninguém vê** — que é o problema que o módulo
corrige.

---

## Módulo 10 — `hardening` com selo

**1. Seis etapas**

Inventário → **redução** → configuração → isolamento → detecção → **verificação**.

**2. Redução a mais eficaz**

Porque **a superfície deixa de existir**. Nenhum firewall, `seccomp` ou log substitui **não ter o
serviço**.

**3. CIS inteiro**

Porque traz **todos** os itens, incluindo os de **alto risco de quebra**, e **sem ordem**. Aplicar
tudo de uma vez quebra o sistema — e você não sabe qual item quebrou.

**4. Cinco `sysctl` de memória**

`randomize_va_space=2` · `dmesg_restrict=1` · `kptr_restrict=2` · `yama.ptrace_scope=1` ·
`suid_dumpable=0`.

**5. `core_pattern` com pipe**

Porque o kernel **executa o programa** ao gerar core dump — **como `root`**. Se o programa é
gravável, é execução de código arbitrário como `root`.

**6. Cinco `sysctl` de rede**

`ip_forward=0` (não roteia) · `accept_redirects=0` (sem ICMP redirect) ·
`accept_source_route=0` · `rp_filter=1` (anti-spoofing) · `tcp_syncookies=1` (anti-SYN flood).

**7. `fs.protected_symlinks`**

Impede o ataque de symlink em `/tmp` — **o mecanismo do módulo 7**. Sem ele, a classe clássica
funciona.

**8. Ordem dos `sysctl`**

Ordem alfabética dos diretórios, e `/etc/sysctl.d/99-*` carrega **por último**. **O último a
carregar ganha** — por isso o número alto.

**9. Verificação de persistência**

**Reboot.** Não há atalho. Um `sysctl` que volta no boot é hardening que não existe — e você só
descobre testando.

**10. `ip_forward=0`**

Porque **quebra contêiner com rede bridge** — o host precisa rotear para o contêiner alcançar a
internet. **É o exemplo perfeito de hardening que quebra.**

**11. LSM**

**Controle de acesso obrigatório.** Restringe o que o processo pode acessar, mesmo como `root`.
Perfil por caminho (AppArmor) ou rótulo (SELinux).

**12. Só o LSM restringe `root`**

`seccomp` restringe **syscall** · capability limita **operação** · namespace limita **visão** —
mas `root` com as capability adequadas passa por tudo. **O LSM diz "não, nem `root`".**

**13. `complain` vs. `enforce`**

`complain` **registra mas permite** — evidência sem proteção. `enforce` **nega e registra**.
Procedimento: complain → observar log → ajustar perfil → enforce.

**14. AppArmor vs. SELinux**

AppArmor: **perfil por caminho**, Ubuntu/Debian. SELinux: **rótulo e tipo**, RHEL/Fedora.

**15. Três diretivas de maior valor**

`NoNewPrivileges=yes` (fecha `setuid`) · `ProtectSystem=strict` (disco RO) ·
`MemoryDenyWriteExecute=yes` (força `W^X`).

**16. `MemoryDenyWriteExecute`**

Fecha o requisito de exploit (região W+X). **Quebra** Java, .NET, Node.js (V8), e qualquer JIT.

**17. Não editar `/usr/lib/systemd/system/`**

Porque a **atualização de pacote sobrescreve**. Use `systemctl edit`, que cria override em
`/etc/systemd/system/<nome>.d/`.

**18. Sequência**

`systemctl edit` → `daemon-reload` → `restart` → **`status`** (confirma que subiu) →
`systemctl show -p <Diretiva> --value` (confirma o valor efetivo).

**19. Reverter `systemd`**

`systemctl revert <nome>.service`.

**20. O selo prova segurança?**

**Não.** Prova que **os parâmetros conferidos** estão no valor esperado. **Sobra o que não foi
conferido:** aplicação, lógica, configuração específica. **O selo é medida, não garantia.**

---

## Módulo 11 — Projeto

**1. Oito classes**

Ver README e `glossario.md`. Cada uma com um achado típico da VM.

**2. `setuid` em dir gravável**

Qualquer usuário **substitui o binário** (o diretório é gravável) e ele **roda como `root`**.
Escalação imediata, por configuração.

**3. `tar`, `find`, `systemctl`**

`sudo tar cf /dev/null x --checkpoint=1 --checkpoint-action=exec=sh` ·
`sudo find / -exec sh \;` · `sudo systemctl link /tmp/evil.service` (registra unit arbitrário).

**4. Wildcard em `sudoers`**

Porque o **comando autorizado tem opção que executa outro**. O wildcard limita a **string**, não o
**efeito**.

**5. Correção que mantém funcionalidade**

**Um wrapper** (`/usr/local/bin/backup-wrapper`) que **valida o argumento** e chama só o que é
permitido. **É a diferença entre remover a funcionalidade e corrigir o privilégio.**

**6. Serviço sem `User=`**

Porque **`ExecStart=/usr/bin/sleep` não precisa de `root`**. O privilégio é gratuito, e é a
diferença entre um comprometimento de serviço e um comprometimento de sistema.

**7. `Storage=volatile`**

Porque **todo log some no reboot** — e reiniciar apaga a evidência. Escolha consciente do atacante.

**8. Cron com caminho relativo**

O cron resolve o nome pelo **`PATH` do cron**. Diretório gravável no `PATH` = você controla o
comando, que roda como `root`.

**9. `visudo -c`**

Porque **sintaxe inválida tranca todo o `sudo`** — inclusive para você. Sem ele, o erro é
descoberto no próximo `sudo`, **quando você já não consegue corrigir**.

**10. Verificação no `hardening`**

Porque a flag pode não ter efeito: sobrescrita por outro arquivo, revertida no reboot, ou o
serviço não recarregado. **Sem verificar, você tem intenção.**

**11. Descrever vs. executar**

Descrever é **auditoria** — o achado é o caminho, não a execução. Executar é **ataque** — mesmo na
própria VM, o hábito é o que importa. **A VM tem as falhas de propósito para que você pratique sem
consequência.**

**12. Seção "não verificado"**

Porque um relatório que não declara cobertura incompleta **parece mais completo e é menos útil** —
o cliente não sabe onde não olhar.

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| Comando executado | 30% | Com a saída **real**, não exemplo |
| Interpretação | 30% | Você sabe o que o resultado significa |
| Ação/verificação | 25% | Corrigiu e **provou** |
| Limitações | 15% | Declara o que não verificou |

**Penalidades automáticas:**

- Saída de exemplo em vez da real: −25%.
- Achado sem `uid`/caminho/permissão: −15%.
- Correção sem verificação: −10%.
- Achado classificado como vulnerabilidade quando é postura: −5%.
- Ausência do comando de reversão: −10%.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| **Achados** | 4 de 8 | 7 de 8 | **8 de 8** |
| Evidência | Só o achado | Comando + saída | Comando + saída + **contexto** |
| Classificação | Tudo "vulnerabilidade" | Separa às vezes | **Vulnerabilidade / má config / postura** |
| Caminho | Ausente | Descrito | **Passo a passo, sem executar** |
| Correção | Genérica | Comando | Comando + **wrapper quando necessário** |
| Verificação | Ausente | Menciona | **Comando que prova** |
| Reversão | Ausente | Menciona | **Comando exato** |
| Limitações | Ausente | Lista o óbvio | **3+ itens com motivo** |
| Conduta | Ausente | Menciona | **Declaração preenchida** |

**Os dois itens de maior valor:**

1. **A classe 4 corrigida com wrapper** — mantém a funcionalidade. Qualquer um remove a regra;
   poucos **resolvem o privilégio sem quebrar o operador**.
2. **O caminho de exploração descrito, não executado** — é o que separa auditoria de ataque.

---

*Material didático original. Auditoria e endurecimento apenas em laboratório próprio.*
