# Fuzzing e Pesquisa de Vulnerabilidades

Curso de 40 horas, doze módulos. Do "por que isso corrompe memória" até o **achado reproduzível
com reporte aceito**.

**A tese do curso**

Ninguém deixa de ser usuário de ferramenta lendo um curso sobre a ferramenta. Você deixa no dia em
que **sabe por que a ferramenta falhou naquele caso**. Este curso existe para forçar isso: toda
campanha tem um momento de "por que o fuzzer não achou", e é aí que você aprende.

**Material original.** Referências na [ementa](00-ementa.md).

---

## A trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [Memória, corrupção e o crash](modulo-01.md) | 3 | Um alvo com bug próprio, explicado byte a byte |
| 2 | [Ambiente e sanitizers](modulo-02.md) | 3 | Build instrumentado e relatório do ASan lido |
| 3 | [Anatomia de um bug](modulo-03.md) | 4 | Cinco classes de bug reproduzidas |
| 4 | [Harness](modulo-04.md) | 4 | Harness próprio, com estado |
| 5 | [Corpus e dicionário](modulo-05.md) | 3 | Campanha com cobertura medida |
| 6 | [AFL++ na prática](modulo-06.md) | 4 | Campanha paralela produzindo crashes |
| 7 | [libFuzzer e CI](modulo-07.md) | 3 | Alvo integrado a fuzzing contínuo |
| 8 | [Protocolo e estado](modulo-08.md) | 3 | Fuzzer de protocolo com sessão válida |
| 9 | [Triagem](modulo-09.md) | 4 | 500 crashes reduzidos a M bugs |
| 10 | [Minimização](modulo-10.md) | 3 | Entrada mínima reprodutível |
| 11 | [Causa raiz](modulo-11.md) | 3 | Bug rastreado até a linha |
| 12 | [Reporte](modulo-12.md) | 3 | Reporte aceito, com patch e regressão |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md) · [Alvos](alvos/README.md)

---

## ⚠ Antes do primeiro lab

### Os alvos são seus

| Você faz | Você **não** faz |
|---|---|
| Compila o alvo, com bug deliberado | Fuzza software de terceiro |
| Fuzza em `localhost` | Campanha contra serviço externo |
| Acha, triagem, relata | Arma exploit |
| Publica com divulgação responsável | Publica antes do patch |

⚠ **A segunda linha é técnica, não cerimonial.** Fuzzer rodando contra alvo que não é seu consome
recurso dele — é negação de serviço, mesmo sem intenção. Todo o curso roda local.

### O que o curso não ensina

⚠ **Não há módulo de armazenamento de exploit.** Não há cálculo de offset, controle de EIP, ROP
chain, nem bypass de mitigação.

**Por quê:** encontrar o crash e **entender por que ele dá controle** é o que permite priorizar e
reportar bem. **Armar** é passo seguinte, específico do alvo, e não se ensina em abstrato — se
ensina contra o binário que você vai atacar.

### O que o curso ensina que dá vantagem real

| Habilidade | Por que vale |
|---|---|
| **Dizer se o crash é só DoS ou dá controle** | Separa o reporte aceito do ignorado |
| **Explicar a causa raiz** | É o que o mantenedor precisa para corrigir |
| **Triagem em escala** | 500 crashes → 4 bugs é trabalho de pesquisador |
| **Saber por que o fuzzer falhou** | O que separa você da ferramenta |

---

## Monte o ambiente

```bash
sudo apt update
sudo apt install -y build-essential clang llvm lld gdb \
                    afl++ afl++-doc python3 python3-pip \
                    valgrind strace file binutils cmake ninja-build git
pip3 install boofuzz
```

Verificação — **o teste que importa:**

```bash
afl-clang-fast --version || echo "⚠ AFL++ sem compilador instrumentado — reinstale"
clang --version | head -1
```

⚠ **Se `afl-clang-fast` não existir**, o AFL++ foi instalado sem os wrappers de compilação e
metade do curso não roda. Reinstale o pacote completo antes de continuar.

---

## Ritmo

| Bloco | Duração | Módulos |
|---|---|---|
| **Etapa 1 — Fundamentos** | 3–5 semanas | 1–3 |
| **Etapa 2 — Ferramentas** | 4–6 semanas | 4–7 |
| **Etapa 3 — Pesquisa** | 4–6 semanas | 8–10 |
| **Etapa 4 — Original** | contínuo | 11–12 |

⚠ **Estimativa otimista a 10–15 h/semana. Na prática, multiplique por 1,5.** O módulo 9 (triagem)
e o 12 (reporte) sempre levam mais do que parece — são os que exigem julgamento, não comando.

---

## Como isso se conecta com o resto do material deste chat

| Curso | Ligação com este |
|---|---|
| **Assembly e RE** | Pré-requisito do módulo 11 (causa raiz) |
| **Redes** | Base do módulo 8 (fuzzing de protocolo) |
| **Malware** | Contexto de análise de artefato hostil |
| **OSINT/APT** | Pesquisa independente: este curso é a oficina |

⚠ **O módulo 11 depende do curso de assembly.** Ler o `gdb` de um crash de heap sem saber ler
disassembly é o caminho mais rápido para desistir.
