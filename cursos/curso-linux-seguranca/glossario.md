# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| ACL | Access Control List | M3 | Permissão por usuário específico, fora dos nove bits. **Invisível no `ls` sem o `+`.** |
| ACL padrão | Default ACL | M3 | Herança aplicada a todo arquivo criado no diretório. Sem ninguém definir nada. |
| `AppArmor` | AppArmor | M10 | LSM por caminho. Ubuntu/Debian. Perfil em `complain` só avisa. |
| `auditd` | audit daemon | M9 | **O único que registra syscall.** Responde "quem abriu `/etc/shadow`". |
| `auid` | Audit UID | M9 | Quem se **autenticou originalmente**. Sobrevive ao `sudo` — é o campo de atribuição. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Bit especial | Special permission bit | M3 | `setuid` (4000), `setgid` (2000), sticky (1000). Os três além dos nove. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Capability | Capability | M5 | Divisão do privilégio de `root`. Fica em atributo estendido — **invisível no `ls`**. |
| `CapBnd` | Bounding set | M5 | **Teto absoluto.** Nada acima é alcançável, nunca. |
| `CapEff` | Effective set | M5 | **O que o kernel verifica agora.** Como o `uid` efetivo. |
| `cgroup` | Control group | M6 | Limita **uso** de recurso. Namespace isola visão; `cgroup` limita consumo. |
| `chattr +i` | Immutable attribute | M3 | Nem `root` apaga sem remover. Achado nos dois sentidos (proteção e persistência). |
| `CLOSE_WAIT` | CLOSE_WAIT | M8 | O outro lado fechou e o programa não fechou. Muitos = vazamento de descritor. |
| `complain` | Complain mode | M10 | LSM que **registra mas não bloqueia**. Evidência sem proteção. |
| Contêiner | Container | M6 | Pacote de **oito** configurações. **Não é fronteira de segurança por si.** |
| Credencial efetiva | Effective UID | M2 / M4 | **O que o kernel usa** para decidir permissão. `setuid` muda este. |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Delegação | Privilege delegation | M4 | Formas de dar privilégio: `sudo`, `setuid`, capability, `polkit`, cron. |
| Duração de vida | Storage duration | — | (curso de C) Escopo ≠ duração. |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `enforce` | Enforce mode | M10 | LSM que **bloqueia**. O estado desejado. |
| `execve` | execve | M9 | Syscall de execução. Regra de `auditd` sobre ela registra cada binário rodado. |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `fd` | File descriptor | M2 / M7 | Número que aponta para arquivo, socket ou dispositivo aberto. **Pode apontar para arquivo removido.** |
| `FORTIFY` | FORTIFY_SOURCE | — | (curso de C) Verificação em biblioteca. |

## G

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `GTFOBins` | GTFOBins | M4 | Catálogo público de binários que escapam para shell. **Consulta defensiva:** o que remover do `sudoers`. |

## H

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `hardening` | Hardening | M10 | Endurecer. **Só conta com verificação** — o selo. |
| Hardlink | Hard link | M7 | Novo nome para o **mesmo `inode`**. `rm` num não apaga o dado. |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `inode` | inode | M7 | **O arquivo é o número.** O nome é só entrada de diretório apontando para ele. |

## J

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `journald` | systemd-journald | M9 | Log binário e indexado. **Não vê syscall.** `Storage=volatile` perde tudo no reboot. |

## L

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `loginuid` | loginuid | M9 | O `auid` do processo. `4294967295` = **não definido** — ação não atribuível. |
| LSM | Linux Security Module | M10 | Controle de acesso obrigatório. **A única camada que restringe `root`.** |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Módulo de kernel | Kernel module | M1 | Código no kernel. Cada um é privilégio máximo. Superfície de kernel. |

## N

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Namespace | Namespace | M6 | Partição de recurso global. **Só o `user` muda privilégio.** |
| `nsenter` | nsenter | M6 | Entrar no namespace de outro processo. Exige `CAP_SYS_ADMIN`. |
| `netns` | Network namespace | M8 | Namespace de rede. **`iptables` é por namespace.** |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| PAM | Pluggable Authentication Modules | M4 | Onde a decisão de autenticação acontece. `nullok` aceita senha vazia. |
| `pam_faillock` | pam_faillock | M4 | Bloqueio após N falhas. Ausente = brute force sem limite. |
| `pam_exec` | pam_exec | M4 | **Executa programa na autenticação.** Se gravável, é execução como quem autentica. |
| `polkit` | polkit | M4 | Autorização do desktop. **Pouco auditado.** Regra pode permitir sem senha. |
| `PrivateTmp` | PrivateTmp | M7 | `/tmp` próprio do serviço. **Resolve a classe do `/tmp` inteira.** |
| `privilégio desnecessário` | Excessive privilege | M1 / M4 | Classe 2. Serviço como `root` sem precisar. Frequente e acionável. |
| `ptrace_scope` | Yama ptrace_scope | M2 | `0` = qualquer processo do mesmo uid depura. `1` = só descendente. |
| `PTR` | Pointer record | — | (curso de Enumeração) DNS reverso. |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `rbash` | Restricted bash | — | (curso de Bash) Shell restrito. |
| Reversão | Rollback | M10 | O comando que desfaz. **Toda mudança precisa de uma.** |
| `rsyslog` | rsyslog | M9 | Log em texto. Encaminha para remoto — **a única defesa real**. |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `seccomp` | seccomp | M5 | Filtro de **syscall**. Modo 2 é o usado. Defesa em profundidade. |
| `SELinux` | SELinux | M10 | LSM por rótulo. RHEL/Fedora. `Permissive` não bloqueia. |
| Selo | Verification seal | M10 | **Item medido, esperado, status.** O que separa hardening de intenção. |
| `setcap` | setcap | M5 | Grava capability no **atributo estendido** do arquivo. Invisível no `ls`. |
| `setgid` | setgid | M3 | Em arquivo: executa como o grupo do dono. Em diretório: **novo arquivo herda o grupo**. |
| `setuid` | setuid | M3 | Executa como o dono. **`S` maiúsculo não faz efeito** (sem execução). Em script, ignorado. |
| Sticky | Sticky bit | M3 | Só o dono apaga. **`/tmp` sem sticky é achado.** |
| `sudoers` | sudoers | M4 | Arquivo mais perigoso do sistema. **Wildcard não restringe nada.** |
| `systemd` | systemd | M1 | PID 1. Cada unit é superfície. 21 diretivas de isolamento. |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| Teto de capability | Capability bounding | M5 | `CapBnd`. Fronteira que nunca aumenta. |

## U

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `uid 0` | uid 0 | M4 | **É `root`, independente do nome.** Conta extra com `uid 0` é achado. |
| `umask` | umask | M3 | Máscara que subtrai permissão do padrão. **Não aparece no `ls`.** |
| `unshare` | unshare | M6 | Cria namespace **sem contêiner**. Mostra o mecanismo. |
| `user namespace` | User namespace | M6 | **O único que muda privilégio.** Sem ele, `root` no ns é `root` no host. |
| `uevent_helper` | uevent_helper | M2 | Se com caminho, o kernel **executa como `root`**. Achado crítico. |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `valgrind` | Valgrind | — | (curso de C) Emula o processador. |

## W

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| `W^X` | Write XOR Execute | M2 | Região **não pode** ser gravável e executável. Requisito de exploit. |
| `wtmp` / `btmp` | wtmp / btmp | M9 | Registro binário de login (sucesso / falha). Comandos `last` / `lastb`. |

---

## As oito classes de má configuração — consulta rápida

| # | Classe | Achado típico | Correção |
|---|---|---|---|
| 1 | Permissão excessiva | `setuid` em dir gravável, `chmod 777`, sem sticky | `chmod`, `chown` |
| 2 | Privilégio desnecessário | Serviço como `root`, capability ampla | `User=`, `setcap -r` |
| 3 | Credencial exposta | `.env` `644`, chave sem senha, backup legível | `chmod 600` |
| 4 | Delegação ampla | `sudo NOPASSWD: ALL`, wildcard, GTFOBins | wrapper validado |
| 5 | Isolamento ausente | Socket montado, `privileged`, `SYS_ADMIN` | remover do `docker run` |
| 6 | Caminho não confiável | Cron relativo, script gravável, `ld.so.preload` | caminho absoluto |
| 7 | Detecção ausente | Sem `auditd`, `Storage=volatile` | regras + `persistent` |
| 8 | Superfície desnecessária | `telnet`, `ftp`, serviço sem uso | remover |

⚠ **As classes 1 a 4 são as mais frequentes e as mais fáceis de corrigir.**

---

## As sete perguntas que só o `auditd` responde — consulta rápida

| # | Pergunta | Regra |
|---|---|---|
| 1 | Quem mexeu na identidade? | `-w /etc/passwd -p wa -k identidade` |
| 2 | Quem virou outro usuário? | `-S setuid -S setgid -k mudanca_uid` |
| 3 | Quem mudou capability? | `-S capset -k capability` |
| 4 | **Onde o atacante se instalou?** | `-w /etc/cron.d/ -w /etc/systemd/system/ -k persistencia` |
| 5 | Quem carregou módulo? | `-S init_module -k modulo_kernel` |
| 6 | Quem mexeu na rede? | `-S setns -S unshare -k namespace` |
| 7 | Quem montou? | `-S mount -k montagem` |

⚠ **Sem `auditd`, nenhuma das sete tem resposta.** `journald` vê a mensagem da aplicação, não a operação do kernel.

---

## As quatro configurações que anulam contêiner — consulta rápida

| Configuração | Por que é o host |
|---|---|
| `privileged: true` | Todas as capability, todos os dispositivos, sem `seccomp` |
| `/var/run/docker.sock` montado | Quem controla o socket **cria contêiner privilegiado** |
| `cap_add: [SYS_ADMIN]` | Montagem, namespace, LSM — **`root` na prática** |
| `pid: host` + `network: host` | Vê e alcança tudo, sem namespace nenhum |

---

## Os `sysctl` que importam — consulta rápida

| Parâmetro | Seguro | O que faz |
|---|---|---|
| `kernel.randomize_va_space` | `2` | ASLR completo |
| `kernel.dmesg_restrict` | `1` | Só root lê `dmesg` |
| `kernel.kptr_restrict` | `2` | Esconde ponteiro de kernel |
| `kernel.yama.ptrace_scope` | `1` | Só depura descendente |
| **`kernel.core_pattern`** | caminho não gravável | ⚠ **Nunca pipe** |
| `kernel.suid_dumpable` | `0` | Sem core de `setuid` |
| `net.ipv4.ip_forward` | `0` | ⚠ `1` se contêiner com NAT |
| `net.ipv4.conf.all.accept_redirects` | `0` | Sem ICMP redirect |
| `net.ipv4.conf.all.rp_filter` | `1` | Anti-spoofing |
| `net.ipv4.tcp_syncookies` | `1` | Anti-SYN flood |
| **`fs.protected_symlinks`** | `1` | ⚠ Defesa contra symlink em `/tmp` |
| `fs.protected_hardlinks` | `1` | Impede hardlink para arquivo alheio |

---

## As placas do `systemd` — consulta rápida

| Diretiva | O que faz |
|---|---|
| `NoNewPrivileges=yes` | Impede ganhar privilégio. **Fecha o `setuid`.** Alto valor, baixo risco. |
| `ProtectSystem=strict` | `/usr`, `/boot`, `/etc` somente leitura |
| `ProtectHome=yes` | `/home` inacessível |
| `PrivateTmp=yes` | `/tmp` próprio. **Resolve a classe do `/tmp`.** |
| `PrivateDevices=yes` | Sem `/dev` real |
| `MemoryDenyWriteExecute=yes` | ⚠ Força `W^X`. **Quase fecha exploit. Quebra JIT.** |
| `SystemCallFilter=` | `seccomp` pelo `systemd` |
| `CapabilityBoundingSet=` | Teto de capability |
| `PrivateNetwork=yes` | Sem rede (só loopback) |
| `ReadWritePaths=` | Exceção ao `ProtectSystem` |

⚠ **Nunca editar `/usr/lib/systemd/system/*.service`** — a atualização sobrescreve. Use `systemctl edit`.

---

## A ordem de `hardening` — consulta rápida

| Prioridade | Ação | Risco de quebrar |
|---|---|---|
| 1 | Remover serviço desnecessário | **Baixo** |
| 2 | Corrigir permissão | **Muito baixo** |
| 3 | Corrigir `sudoers` | ⚠ Médio |
| 4 | `sysctl` | Baixo |
| 5 | Ativar `auditd` | Baixo |
| 6 | Log remoto | Baixo |
| 7 | Diretivas de `systemd` | ⚠ **Alto** |
| 8 | LSM em `enforce` | ⚠ Alto |
| 9 | `mount` com flags | ⚠ Alto |
| 10 | `seccomp` customizado | ⚠ Alto |

⚠ **As cinco primeiras resolvem a maior parte e quase não quebram nada.**

---

## Os cinco pontos que o curso tenta deixar

| # | Ponto |
|---|---|
| 1 | **Não é "quais vulnerabilidades" — é "qual é a superfície".** |
| 2 | **`/proc` é a fonte de verdade.** Processo, socket, namespace, credencial. |
| 3 | **Capability é invisível no `ls`** — e `cap_sys_admin` é `root`. |
| 4 | **Contêiner não é fronteira de segurança.** `privileged` e socket montado **são o host**. |
| 5 | **`hardening` sem verificação é intenção.** O selo é o que vale. |

---

*Material didático original. Auditoria e endurecimento apenas em laboratório próprio.*
