---
title: "Linux para Seguranca: O Sistema Como Superficie"
nivel: intermediario
tags: [linux, proc, permissoes, namespace, setuid, capability]
---
# Linux para Segurança: O Sistema Como Superfície

**Ementa do curso · 34 horas · 11 módulos · PT-BR com termos técnicos em inglês**


## Por que este curso existe

⚠ **Este é o curso que destrava o resto.** Três cursos deste material — **exploit development**,
**malware**, **APT e C2** — assumem Linux em nível de sistema. Nenhum ensina. **Você trava no mesmo
lugar em três cursos diferentes:** não sabe ler `/proc`, não entende `setuid`, não sabe o que é um
namespace.

⚠ **E há o motivo de segurança, mais importante:** a maioria das falhas de escalação de privilégio
em Linux **não é bug de kernel**. É **má configuração**:

| Achado real | O que é |
|---|---|
| Binário `setuid` de terceiro | Permissão herdada de instalação antiga |
| `sudo` com `NOPASSWD` para comando amplo | Conveniência que virou porta |
| Capability `cap_sys_admin` em binário comum | "Resolveu" o problema adicionando privilégio |
| Serviço de sistema rodando como `root` | Foi mais fácil |
| Contêiner com socket do Docker montado | "Para o CI funcionar" |
| Script cron em diretório gravável | Caminho relativo |
| Arquivo de backup com credencial, `chmod 644` | Ninguém lembrou |
| Chave SSH privada sem passphrase em `/home` | Backup do Git |

⚠ **A tese do curso:**

> **O controle de acesso do Linux não está num lugar. Está em quinze: bits de permissão,
> capability, ACL, SELinux, AppArmor, namespace, `cgroup`, PAM, `sudoers`, `systemd`, e outros.**
> O caminho de escalação está sempre na **interseção** de dois deles.

⚠ **Nada aqui é exploit de kernel.** Este curso ensina **auditar e endurecer** — e ensina a
**encontrar** a falha de configuração antes que ela vire caminho de privilégio.


## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Ler `/proc` como fonte de verdade sobre processo, memória, socket e namespace.
2. Explicar o modelo de permissão completo: bits, `setuid`, sticky, ACL, capability.
3. Auditar `sudo`, PAM e `sudoers` procurando caminho de escalação.
4. Enumerar a superfície do sistema e classificar achado por risco real.
5. Entender namespace e `cgroup`, e **por que** contêiner não é fronteira de segurança.
6. Configurar `auditd` e `journald` para detectar o que importa.
7. Aplicar `hardening` com selo de verificação — não com flag.
8. Reconhecer as oito classes de má configuração que geram escalação.
9. Distinguir falha de configuração de falha de kernel.
10. Produzir um relatório de auditoria com evidência e correção.

⚠ **O objetivo 9 é o mais importante.** A maioria dos relatórios de auditoria de Linux erra ao
tratar tudo como "vulnerabilidade". **A maior parte é configuração** — e a correção é outra.


## O laboratório

⚠ **Duas VMs.** Uma limpa, para você configurar; uma **deliberadamente mal configurada**, para você
auditar.

```bash
# Host (sua máquina)
sudo apt update
sudo apt install -y qemu-kvm libvirt-daemon-system virtinst bridge-utils \
                    ansible git curl jq
```

| VM | Papel | Como |
|---|---|---|
| **`linux-lab`** | Limpa — você configura | Ubuntu Server 24.04 ou Debian 12, mínima |
| **`linux-alvo`** | **Mal configurada** — você audita | O mesmo, com falha plantada pelo `ansible` do curso |

⚠ **A `linux-alvo` tem falha plantada de propósito** e **nunca** deve ter interface exposta fora da
rede interna do laboratório. Os arquivos de `ansible` do módulo 11 plantam:

- binário `setuid` fora do padrão
- `sudo` com `NOPASSWD` para comando amplo
- service rodando como `root` sem necessidade
- cron job com caminho relativo em diretório gravável
- arquivo de backup com credencial legível
- contêiner com socket do Docker montado
- capability excessiva em binário comum
- `sysctl` permissivo (`kernel.core_pattern` apontando para lugar gravável)

⚠ **Se você não quer montar duas VMs**, o curso funciona com **uma** — usando `unshare` e `podman`
para simular os cenários de namespace (módulo 6). Cada módulo traz a alternativa.


## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (11) | 55% | Comando executado, saída real, interpretação |
| Enumeração da superfície (módulo 4) | 15% | Achado classificado por risco |
| Detecção configurada (módulo 9) | 10% | Regra de `auditd` que funciona |
| Relatório de auditoria (módulo 11) | 20% | Evidência + classificação + correção |

**Rubrica central:** você não entrega "rodei o `lynis`". Você entrega **o achado**, **a evidência**
(comando e saída), e **a classificação** — separando **má configuração** de **falha de kernel**.


## Referências abertas

- **man pages do sistema** — `man 5 proc`, `man 7 capabilities`, `man 7 namespaces`, `man 5 sudoers`
- **Linux Kernel Documentation** — https://docs.kernel.org/
- **`proc` filesystem** — https://docs.kernel.org/filesystems/proc.html
- **capabilities(7)** e **credentials(7)** — a referência canônica
- **`auditd`** — https://github.com/linux-audit/audit-documentation
- **CIS Benchmarks** — https://www.cisecurity.org/cis-benchmarks
- **Lynis** — https://cisofy.com/lynis/
- **"The Linux Programming Interface"** — Michael Kerrisk
- **"Linux Kernel Development"** — Robert Love
- **"Understanding the Linux Kernel"** — Bovet & Cesati
- **`unshare(1)`**, **`nsenter(1)`**, **`cgroups(7)`**
- **OST2 `Arch1001`** e **OST2 `Linux`** — https://ost2.fyi/
- **GTFOBins** — https://gtfobins.github.io/ (consulta **defensiva**: o que remover)
