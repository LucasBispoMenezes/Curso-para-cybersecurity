# Glossário — Pesquisa de Segurança em Windows: Do Mapa ao Achado

**Termos do curso, definidos uma vez, em ordem alfabética**

---

## A

**`ACG`** — *Arbitrary Code Guard*. Impede página executável nova. ⚠ **Não protege ring 0 e não se propaga** para o processo vizinho.

**`AMSI`** — *Antimalware Scan Interface*. ⚠ É **interface**, não inspeção: processo sem `amsi.dll` não tem cobertura.

**Assinatura (de driver)** — Garante **procedência**, ⚠ não ausência de bug. O Windows carrega driver assinado de qualquer fabricante.

---

## B

**`BYOVD`** — *Bring Your Own Vulnerable Driver*. ⚠ Usar driver **assinado e vulnerável** em vez de escrever um malicioso. **Contorna `PPL`** chegando em ring 0.

---

## C

**`CancelRoutine`** — Rotina que coordena o cancelamento de `IRP`. ⚠ Sua ausência é a corrida clássica.

**`CFG`** — *Control Flow Guard*. Valida chamada indireta. ⚠ Valida o **destino**, não a **intenção**.

**Confusão de tipo** — Usar bytes de um tipo como se fossem de outro. ⚠ **Sem sobrescrever nada** — muda a interpretação.

**Contrato (do `IOCTL`)** — O que o driver **promete** fazer com o buffer. ⚠ **A tese do curso**: o bug está na diferença entre a promessa e o feito.

---

## D

**`DPC`** — *Deferred Procedure Call*. ⚠ Roda em `DISPATCH_LEVEL` e **não pode bloquear** — o que empurra o driver para a dessincronização.

**`Driver Verifier`** — ⚠ **Instrumento, não defesa.** Com *special pool*, faz o crime aparecer **na cena**.

---

## E

**`ETW`** — *Event Tracing for Windows*. ⚠ **Instrumentação**: o que não é emitido não é visto. `IOCTL` de driver costuma **não ter provider**.

---

## H

**`HVCI`** — *Hypervisor-Protected Code Integrity*. ⚠ A **única defesa estrutural** contra `BYOVD`, porque restringe o que roda em ring 0.

---

## I

**`IOCTL`** — Código de 32 bits: `DeviceType`, `Access`, `Function` e ⚠ **`Method`** (2 bits baixos). ⚠ **O número anuncia o contrato.**

---

## M

**`METHOD_BUFFERED`** — ⚠ **Copia** (protege contra TOCTOU) e **não valida tamanho**.

**`METHOD_NEITHER`** — ⚠ ⚠ **Não copia e não valida.** Exige `ProbeForRead`/`Write`, `__try/__except` e cópia única.

---

## O

**`OBJECT_HEADER`** — Antecede o corpo do objeto. ⚠ Guarda o **tipo** — e corrompê-lo muda a semântica.

**`ObReferenceObject` / `ObDereferenceObject`** — ⚠ O par de contagem de referência. O padrão dominante de bug é **não pegar referência antes do uso assíncrono**.

---

## P

**Pool spray** — ⚠ Encher o pool com objetos de tamanho e conteúdo controlados, para escolher **o vizinho**. É metade do trabalho.

**`PRIMITIVA`** — ⚠ **O que o bug PERMITE** — leitura, escrita, controle. *Bugcheck não é achado; primitiva é.*

**`ProbeForRead` / `ProbeForWrite`** — Sondagem do ponteiro do userspace. ⚠ Sozinhas **não bastam**: a sondagem e a cópia ficam dentro do `__try`.

**`PPL`** — *Protected Process Light*. ⚠ Recusa acesso **até de `SYSTEM`**, mas **não revoga handle concedido** e **não bloqueia `SYNCHRONIZE`**.

---

## R

**`refcount`** — Contador de referência. Os três padrões: a mais, a menos, e o **caminho de erro** esquecido.

---

## S

**Snapshot** — ⚠ Obrigatório em todo lab do curso: ele **quebra** a VM de propósito.

**`special pool`** — Flag do `Driver Verifier` que coloca o bloco no **fim da página**. ⚠ É o que faz o overflow atingir página inválida **no culpado**.

---

## T

**Tag (de pool)** — Identifica **quem alocou** o bloco. ⚠ É a informação que **planeja o spray**.

**Taxa** — ⚠ Parte do achado. **Zero significa hipótese errada**, não ausência de bug.

**TOCTOU** — *Time-of-check to time-of-use*. ⚠ Em driver: validar o ponteiro do userspace, e o dado mudar antes do uso.

**`TypeInfo`** — Estrutura com os procedimentos do tipo. ⚠ **Compartilhado entre dois tipos** produz bypass de autorização.

---

## V

**Variante** — ⚠ O **mesmo defeito em outro lugar**. O padrão tem **três partes**: condição, ação e ⚠ **ausência**.

**`Variant hunting`** — Aplicar o padrão a N produtos. ⚠ O fabricante **corrige o reportado, não o padrão**.

---

## W

**`WDF`** — *Windows Driver Framework*. ⚠ Faz **validação de contrato** por você — e é a armadilha de **falso positivo** mais comum do `variant hunting`.

**`WDM`** — Modelo de driver tradicional, onde **você** faz a validação.

---

## Termos que NÃO são deste curso

| Termo | Curso correto |
|---|---|
| `EPROCESS`, `ALPC`, `PEB`, `hive`, `ETW` (mecanismo) | **Windows Internals** |
| ROP, heap grooming, shellcode | Exploit Development |
| Leitura de diff de patch | **Patch Diffing** |
| `kmalloc`, `KASAN`, `nftables`, `io_uring` | Linux Internals |
| `Sigma`, WAF, detecção de rede | Detecção e Evasão |
| Corpus, harness de fuzzing | Fuzzing / Fuzzing Avançado |

⚠ **A relação com `Patch Diffing` é a mais direta:** lá se lê **um** diff; aqui se aplica o **padrão** daquele diff a **N produtos**. ⚠ Os dois cursos se encontram no módulo 10.

---

*Glossário original do curso. As definições assumem o contexto do material — quando um termo tem uso diferente em outro contexto, vale a definição daqui.*
