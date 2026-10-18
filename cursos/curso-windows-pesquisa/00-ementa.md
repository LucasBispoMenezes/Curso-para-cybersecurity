---
title: "Pesquisa de Segurança em Windows: Do Mapa ao Achado"
nivel: especialista
tags: [windows, pesquisa, pool, ppl, amsi, byovd, ioctl, variante]
---
# Pesquisa de Segurança em Windows: Do Mapa ao Achado

**Ementa do curso · 34 horas · 11 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **Alvo** | Não sabe por onde começar | **Escolhe o alvo pelo contrato do `IOCTL`** |
| **Bug** | Conhece a classe | **Reconhece no binário**, sem fonte |
| **Primitiva** | Não pensa nisso | **Sabe o que a corrupção permite** |
| **Corrida** | Sabe o que é | **Detecta a janela** e a reproduz de forma confiável |
| **Variant** | Procura no mesmo arquivo | **Procura no ecossistema**, e acha a variante |
| **Telemetria** | Confia no `EDR` | **Mede o que o `ETW` entrega** |
| **Resultado** | "tem um crash" | **Achado reproduzível com reporte** |
| **Mentalidade** | "windows é difícil" | **"o contrato está errado em algum lugar"** |

**Pré-requisito duro:** curso de **Windows Internals** (objeto, handle, pool, `IOCTL`) · curso de **Exploit Development** (a primitiva).
**Ajuda muito:** curso de **Patch Diffing** (o método de achar a variante) e curso de **Fuzzing** (o harness).

⚠ **Sem o de Internals, você não tem mapa.** **Sem o de Exploit, você não sabe o que o bug permite.**

---

## Por que este curso existe

⚠ **O `Windows Internals` desenhou o mapa. Este curso caça no território.**

⚠ **E a caça no Windows tem uma forma própria, que não é a do Linux:**

| No Linux | No Windows |
|---|---|
| Syscall com número | ⚠ **`IOCTL` com código e método de buffer** |
| Argumento como `struct` | ⚠ **`IRP`, `SystemBuffer`, `METHOD_*`** |
| Compila e lê o kernel | ⚠ **Binário sem fonte, com símbolo parcial** |
| `KASAN` | ⚠ **`Driver Verifier`** |
| UAF em `struct` | ⚠ **UAF em objeto com `refcount` e tipo** |

⚠ **A tese do curso:**

> **No Windows, o bug de kernel quase sempre está no CONTRATO.** O driver declara o método de buffer,
> declara o tamanho, e **não valida o que o userspace mandou**. O resto é consequência.

⚠ **E o diferencial moderno:** o alvo mudou. Hoje o achado de valor não é só o bug de driver — é
**`BYOVD`** (driver assinado e vulnerável), **`PPL`** e o que ele realmente protege, **`AMSI`** e o
que ele **não** cobre, e a **variante** — a mesma falha, no mesmo fornecedor, em outro produto, que
ninguém corrigiu.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. **Triar alvo**: ler a superfície de um driver e decidir se vale o tempo, pelo `IOCTL` e pelo método.
2. Reconhecer **`METHOD_NEITHER`** e o que ele exige do driver — e onde ele erra.
3. Encontrar **corrupção de pool** e saber o que ela permite.
4. Reconhecer **UAF de objeto** e a **contagem de referência** que a causou.
5. Detectar e **reproduzir corrida** de forma confiável, com a janela medida.
6. Reconhecer **confusão de tipo** em objeto e por que o compartilhamento de tipo a produz.
7. Entender **`BYOVD`**: o que a assinatura garante, e o que ela não garante.
8. Avaliar **`PPL`**, `ACG` e `CFG` do lado de quem ataca — o que cada um **realmente** limita.
9. Medir o **`ETW`** e o `AMSI` sob teste — o que a telemetria entrega e o que ela perde.
10. Fazer **`variant hunting`**: o padrão de um patch, aplicado a N produtos.
11. **Escrever o reporte**: alvo, primitiva, reprodutibilidade, impacto e correção.

---

## O laboratório

```powershell
# VM Windows 11 (Evaluation), snapshot limpo, virtualizacao aninhada ligada.
# Kernel debug: VM + host, com WinDbg em modo kernel.

bcdedit /set testsigning on
bcdedit /set debug on
bcdedit /set bootdebug on

# Driver Verifier: o KASAN do Windows.
verifier /standard /driver MeuDriverDeTeste.sys

# WinDbg kernel mode
windbg -k net:port=50000,key=1.2.3.4

# Ferramentas
winget install Microsoft.WinDbg
winget install Sysinternals.Sysinternals
winget install --id Git.Git
```

⚠ **Três decisões do laboratório:**

⚠ **`Driver Verifier` é obrigatório.** Ele faz o que o `KASAN` faz no Linux: transforma uso depois da liberação, corrupção de pool e vazamento em **relatório explícito**. Sem ele, o bug vira bugcheck opaco — ou pior, passa em silêncio.

⚠ **Debug de kernel em VM separada** (`net:port`), nunca na máquina que você usa. O alvo vai bugcheck, e você vai querer o `WinDbg` de fora para ler o estado.

⚠ **`snapshot` antes de cada driver que você instalar.** Você vai instalar driver de terceiro **de propósito** no módulo 7 — e esse é o lab que mais quebra VM.

⚠ **Os drivers testados são os do laboratório, no seu `Verifier`, na sua VM.** Nenhum lab aponta para sistema de terceiro.

---

## Como este curso se conecta aos outros

| Curso | Ligação |
|---|---|
| **Windows Internals** | Pré-requisito: objeto, handle, pool, `IOCTL` |
| **Exploit Development** | Pré-requisito: primitiva, controle de fluxo |
| **Patch Diffing** | Ajuda: a variante e a leitura do diff |
| **Fuzzing** | Ajuda: o harness e a triagem de crash |
| **Detecção e Evasão** | Ligação: `ETW`, `AMSI`, `callback` |
| **APT e C2** | Ligação: persistência e o que ela exige do sistema |

⚠ **Este curso é o topo da trilha de Windows** e o par natural do `Patch Diffing`: um diffa o patch, este caça a variante no produto ao lado.

---

## Módulos

| # | Módulo | Horas |
|---|---|---|
| 1 | Triagem de alvo: como ler a superfície de um driver e decidir se vale | 3 |
| 2 | O contrato do `IOCTL`: código, `METHOD_*`, e onde a validação falta | 3 |
| 3 | Corrupção de pool: reconhecer, medir e o que ela permite | 4 |
| 4 | UAF de objeto: o `refcount`, o tipo, e a janela | 4 |
| 5 | Corrida no kernel: detectar a janela e reproduzir de forma confiável | 3 |
| 6 | Confusão de tipo em objeto: o compartilhamento de tipo como causa | 3 |
| 7 | `BYOVD`: o driver assinado e vulnerável, e o que a assinatura não garante | 3 |
| 8 | `PPL`, `ACG`, `CFG`: o que cada mitigação realmente limita | 3 |
| 9 | `ETW` e `AMSI` sob teste: medir o que a telemetria entrega e perde | 3 |
| 10 | `Variant hunting`: o padrão do patch aplicado a N produtos | 3 |
| 11 | Método e reporte: do alvo ao achado reproduzível, e a divulgação | 2 |

---

## Avaliação e encerramento

- `avaliacoes.md` — banco de questões por módulo, com resposta comentada.
- `glossario.md` — os termos do curso, definidos uma vez, em ordem.
- `README.md` — índice e ordem de leitura.

---

*Material didático original. Todo alvo é do laboratório do aluno, em VM própria, com snapshot.
Nenhum material que ensine atacar sistema de terceiro.*
