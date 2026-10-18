# Linux Internals, Kernel e Escalonamento de Privilégios

**Curso · 34 horas · 11 módulos · Nível: avançado**

---

## Sobre este curso

Este curso é a **segunda metade** da escalação de privilégio em Linux.

O curso de **Linux para Segurança** ensinou que a escalação quase sempre é **má configuração** — binário `setuid` de terceiro, `sudo` com `NOPASSWD`, capability larga, contêiner com socket do Docker montado. Isso é metade do problema, e é a metade que **não é bug**.

Este curso é a outra metade: **o kernel como superfície de ataque**. Código que roda em ring 0, que confia em dado vindo do userspace, e cuja falha não é configuração — é bug.

A pergunta que organiza tudo:

> **Onde o kernel confia em dado que veio do userspace — e quem valida?**

---

## Pré-requisitos

| Pré-requisito | Por quê |
|---|---|
| **Linux para Segurança** | `/proc`, permissão, namespace, capability, contêiner |
| **C para Pesquisa de Segurança** | memória, UB, ponteiro, sanitizer |
| **Assembly e RE** *(ajuda)* | leitura de disassembly e comparação de binário |

⚠ **Sem os dois primeiros, você trava no módulo 2.** Este curso usa os dois, e não repete o que eles ensinam.

---

## Estrutura

| # | Módulo | Horas | O que entrega |
|---|---|---|---|
| 1 | [O kernel como superfície](modulo-01.md) | 3 | syscall, cópia, TOCTOU, e onde a confiança muda de lado |
| 2 | [Ler o kernel](modulo-02.md) | 3 | `vmlinux`, `gdb`, `pahole`, `oops` → linha de código |
| 3 | [Heap do kernel](modulo-03.md) | 3 | `slab`, `kmalloc`, as quatro falhas, `heap spray` |
| 4 | [UAF, race e refcount](modulo-04.md) | 4 | a janela, `userfaultfd`, KASAN, reprodutibilidade |
| 5 | [`io_uring`](modulo-05.md) | 3 | a superfície mais nova, e as três classes de bug |
| 6 | [`netfilter` e `nftables`](modulo-06.md) | 3 | parser, objetos, VM em ring 0 |
| 7 | [Namespace e `cgroup`](modulo-07.md) | 3 | por que o contêiner não é fronteira |
| 8 | [`cred`, capability, `seccomp`](modulo-08.md) | 3 | privilégio do lado do kernel |
| 9 | [`keyring`](modulo-09.md) | 3 | onde o segredo vive no kernel |
| 10 | [eBPF e o verifier](modulo-10.md) | 3 | a prova que pode não provar |
| 11 | [Método e reporte](modulo-11.md) | 3 | do CVE ao achado reproduzível |

**Ordem de leitura:** linear. Cada módulo assume o anterior — os módulos 5 a 10 são aplicações da mecânica do 3 e do 4.

---

## O laboratório

O curso inteiro roda sobre **um kernel compilado por você**, em QEMU, com `gdb` e símbolo. O setup está no módulo 1 e é pré-requisito de todos os labs.

Três decisões que importam:

- **`DEBUG_INFO` ligado** — kernel de distribuição não tem símbolo, e sem ele você não navega `struct`.
- **`KASAN` ligado** — sem sanitizer, UAF não dá panic e você conclui, errado, que não é bug.
- **`nokaslr` + `-s -S`** — endereço previsível e VM esperando o depurador.

⚠ **Nenhum lab aponta para alvo de terceiro.** Todo alvo é o kernel que você compilou, na VM do seu host.

⚠ **Os labs não foram testados em VM.** Valide cada um no seu ambiente antes de publicar ou usar em aula.

---

## Conexões com os outros cursos da trilha

| Curso | Ligação |
|---|---|
| **Linux para Segurança** | Pré-requisito direto |
| **C para Pesquisa de Segurança** | Pré-requisito direto |
| **Assembly e RE** | Ajuda: disassembly de kernel |
| **Exploit Development** | Consequência: o kernel dá a primitiva |
| **Windows Internals** | Paralelo: o mesmo método, outro kernel |
| **Patch Diffing** | Ligação: o CVE de kernel é diff de binário |
| **Detecção e Evasão** | Ligação: LSM, `auditd`, `eBPF` como telemetria |

---

## Arquivos do curso

```
curso-linux-internals/
├── README.md          ← este arquivo
├── 00-ementa.md       ← ementa completa
├── modulo-01.md ... modulo-11.md
├── avaliacoes.md      ← banco de questões
└── glossario.md       ← termos do curso
```

---

*Material didático original. Todos os CVEs, falhas e primitivas são demonstrados em kernel compilado
pelo próprio aluno, em VM isolada, sem alvo de terceiro. Nenhum material que ensine atacar sistema
alheio.*
