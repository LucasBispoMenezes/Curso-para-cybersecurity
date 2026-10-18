# Linux para Segurança

Curso de 34 horas, onze módulos. O sistema operacional como superfície — do `/proc` ao `cgroup`.

---

## A linha de progressão

⚠ **Leia esta tabela antes de começar.** Em cada linha, o que você sabe **no módulo 1** e o que
sabe **no módulo 11**.

| | Módulo 1 | Módulo 11 |
|---|---|---|
| **Processo** | Sabe o que é PID | Lê `/proc/<pid>/maps`, contém com `cgroup` |
| **Permissão** | `chmod 755` | Os 12 bits, `setuid`, capability, ACL, `SELinux` |
| **Usuário** | `sudo` | PAM, `sudoers`, o caminho de escalação |
| **Arquivo** | `ls` e `cat` | `inode`, `hardlink`, `fd` vazado |
| **Rede** | `ip a` | `/proc/net`, namespace, `nft` |
| **Contêiner** | `docker run` | **Por que ele não é fronteira de segurança** |
| **Log** | `/var/log/syslog` | Regra de `auditd` que pega o que importa |
| **Mentalidade** | "configuração é detalhe" | **"configuração é o controle de acesso"** |

**Sem pré-requisito de programação.** Sabe usar terminal? Entra no módulo 1.

---

## A tese

⚠ **O controle de acesso do Linux não está num lugar — está em quinze.** Bits de permissão,
capability, ACL, SELinux, AppArmor, namespace, `cgroup`, PAM, `sudoers`, `systemd`, e mais. **O
caminho de escalação está sempre na interseção de dois deles.**

⚠ **E a maioria das falhas de escalação não é bug de kernel. É má configuração.** Um `setuid`
herdado, um `NOPASSWD` conveniente, uma capability "que resolveu o problema", um serviço rodando
como `root` porque foi mais fácil.

---

## A trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [O sistema como superfície](modulo-01.md) | 3 | O mapa do que atacar |
| 2 | [`/proc` e `/sys`](modulo-02.md) | 4 | Ler o sistema ao vivo |
| 3 | [Permissão: os doze bits](modulo-03.md) | 3 | Auditoria de permissão completa |
| 4 | [Usuário e credencial](modulo-04.md) | 3 | Auditoria de `sudo` e PAM |
| 5 | [Capability e `seccomp`](modulo-05.md) | 3 | O que substitui `root`, e onde falha |
| 6 | [Namespace e `cgroup`](modulo-06.md) | 3 | **Por que contêiner não isola** |
| 7 | [Arquivo, `inode` e resíduo](modulo-07.md) | 3 | O que fica para trás |
| 8 | [Rede do ponto de vista do kernel](modulo-08.md) | 3 | Socket, namespace, `nft` |
| 9 | [Log, `auditd` e detecção](modulo-09.md) | 3 | Regra que funciona |
| 10 | [`hardening` com selo](modulo-10.md) | 3 | Endurecer e **verificar** |
| 11 | [Projeto: auditoria](modulo-11.md) | 3 | **O relatório completo** |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md)

---

## O laboratório — duas VMs

⚠ **Este curso é o que destrava exploit development, malware e APT/C2.** Faça com laboratório de
verdade.

| VM | Papel |
|---|---|
| **`linux-lab`** | Limpa — você configura e endurece |
| **`linux-alvo`** | **Mal configurada** — você audita |

⚠ **A `linux-alvo` tem falha plantada de propósito.** Ela **nunca** deve ter interface exposta fora
da rede interna. Sem exceção.

```bash
# No host
sudo apt update
sudo apt install -y qemu-kvm libvirt-daemon-system virtinst ansible git
```

⚠ **Alternativa com uma VM só:** `unshare` e `podman` simulam os cenários de namespace do módulo 6
sem segunda máquina. Cada módulo traz a alternativa.

---

## As oito classes de má configuração

⚠ **O que o curso ensina a encontrar.** Marque o que você já sabe auditar:

| # | Classe | Achado típico |
|---|---|---|
| 1 | **Permissão excessiva** | `setuid` herdado, `chmod 777`, sticky ausente em `/tmp` |
| 2 | **Privilégio desnecessário** | Serviço como `root`, capability ampla |
| 3 | **Credencial exposta** | Chave privada sem senha, arquivo de backup legível |
| 4 | **Delegação ampla** | `sudo NOPASSWD` para comando genérico |
| 5 | **Isolamento ausente** | Contêiner com socket montado, namespace compartilhado |
| 6 | **Caminho não confiável** | Cron com caminho relativo, `LD_PRELOAD` herdado |
| 7 | **Detecção ausente** | Sem `auditd`, log que não retém |
| 8 | **Superfície desnecessária** | Serviço que não devia estar instalado |

⚠ **As classes 1 a 4 são as mais frequentes, e as mais fáceis de corrigir.** É por aqui que se
começa.

---

## ⚠ Nota de propósito

| Você faz | Você **não** faz |
|---|---|
| Audita **sua** VM | Audita host de produção |
| Acha `setuid` na **sua** máquina | Escala privilégio em host alheio |
| Configura `auditd` | Evade detecção |
| Entende namespace para isolar | Escapa de contêiner alheio |
| Escreve regra de `hardening` | Desativa controle de acesso de outro |

⚠ **Todo comando roda em `~/lab/` e na VM do laboratório.**

---

## Como isso conecta

| Curso | O que ele precisava de você |
|---|---|
| **Exploit Development** | `/proc`, memória, `mmap`, `setuid`, namespace |
| **Malware** | Processo, persistência, `systemd` |
| **APT e C2** | Rede, socket, namespace, log |
| **C para Segurança** | Ler código de binário `setuid` |

⚠ **É pré-requisito de três cursos.** A ordem recomendada: **Linux para Segurança** → **C para
Segurança** → **Exploit Development**.

---

## Ritmo

| Bloco | Duração | Módulos |
|---|---|---|
| **O sistema** | 2 semanas | 1–2 |
| **Controle de acesso** | 3 semanas | 3–5 |
| **Isolamento** | 2 semanas | 6–7 |
| **Rede e detecção** | 2 semanas | 8–9 |
| **Fechamento** | 2 semanas | 10–11 |

⚠ **Estimativa a 10 h/semana.** Os módulos 4 e 6 costumam levar mais — o primeiro porque exige
entender PAM, o segundo porque exige desaprender o que você acha que sabe sobre contêiner.
