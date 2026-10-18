# Pesquisa de Segurança em Windows: Do Mapa ao Achado

**Curso · 34 horas · 11 módulos · Nível: especialista**

---

## Sobre este curso

Este curso é o **segundo** da trilha de Windows, e ele existe porque o `Windows Internals` **desenha o mapa** e não caça nada.

A tese que organiza tudo:

> **No Windows, o bug de kernel quase sempre está no CONTRATO.** O driver declara o método de
> buffer, declara o tamanho, e **não valida** o que o userspace mandou. O resto é consequência.

⚠ **E ela é legível antes de executar qualquer coisa.** Os dois bits baixos do código de `IOCTL` dizem o método; a ausência de uma comparação com `InputBufferLength` na desmontagem diz o resto. **A triagem é leitura; a exploração é a minoria do trabalho.**

---

## Pré-requisitos

| Pré-requisito | Por quê |
|---|---|
| **Windows Internals** | objeto, handle, pool, `IOCTL`, `EPROCESS` |
| **Exploit Development** | a primitiva e o controle de fluxo |
| **Assembly e RE** *(ajuda)* | leitura de desmontagem — o módulo 2 depende |
| **Patch Diffing** *(ajuda)* | o `variant hunting` do módulo 10 |
| **Fuzzing** *(ajuda)* | harness e triagem |

⚠ **Sem os dois primeiros, o curso fica decorativo.**

---

## Estrutura

| # | Módulo | Horas | O que entrega |
|---|---|---|---|
| 1 | [Triagem de alvo](modulo-01.md) | 3 | ler a superfície de um driver e decidir se vale |
| 2 | [O contrato do `IOCTL`](modulo-02.md) | 4 | ⚠ **o módulo central** — método de buffer e validação ausente |
| 3 | [Corrupção de pool](modulo-03.md) | 4 | produzir, medir, e o que ela permite |
| 4 | [UAF de objeto](modulo-04.md) | 4 | o `refcount`, o tipo, e a janela |
| 5 | [Corrida no kernel](modulo-05.md) | 3 | detectar a janela e reproduzir de forma confiável |
| 6 | [Confusão de tipo](modulo-06.md) | 3 | o `TypeInfo` compartilhado como causa |
| 7 | [`BYOVD`](modulo-07.md) | 3 | o driver assinado e vulnerável — reconhecer e detectar |
| 8 | [`PPL`, `ACG`, `CFG`](modulo-08.md) | 3 | o que cada mitigação **realmente** limita |
| 9 | [`ETW` e `AMSI` sob teste](modulo-09.md) | 3 | medir o que a telemetria entrega e perde |
| 10 | [`Variant hunting`](modulo-10.md) | 3 | o padrão de um achado aplicado a N produtos |
| 11 | [Método e reporte](modulo-11.md) | 3 | do alvo ao achado reproduzível, e a divulgação |

⚠ **O módulo 12 do projeto final está em construção** — ele fecha o curso com um alvo de defeitos não anunciados.

**Ordem de leitura:** linear. Os módulos 2 e 3 são a base; os 4 a 6 aplicam; os 7 a 10 avaliam o contexto.

---

## O laboratório

⚠ **Duas exigências que valem para todo o curso:**

⚠ **`Driver Verifier` ligado.** É o instrumento que faz o crime aparecer **na cena**. Sem *special pool*, um overflow corrompe o vizinho e o bugcheck surge **longe do culpado** — e o pesquisador sem instrumento conclui, errado, que não é bug.

⚠ **Snapshot limpo antes de cada lab.** O curso **quebra** a VM de propósito — instala driver sem assinatura, provoca bugcheck e altera sessões `ETW` em execução.

```powershell
bcdedit /set testsigning on
bcdedit /set debug on
verifier /standard /driver <SEU_DRIVER>.sys
```

⚠ **Os drivers são escritos por você, e o alvo é a sua VM.** Nenhum lab instala driver de terceiro para atacar — o módulo 7 trata `BYOVD` como **fenômeno a reconhecer e detectar**.

⚠ **Os labs não foram testados em VM.** Valide cada um no seu ambiente antes de publicar ou usar em aula.

---

## Conexões com os outros cursos da trilha

| Curso | Ligação |
|---|---|
| **Windows Internals** | Pré-requisito direto: o mapa |
| **Exploit Development** | Pré-requisito: a primitiva |
| **Assembly e RE** | Ajuda: a desmontagem do módulo 2 |
| **Patch Diffing** | ⚠ Ligação: o `variant hunting` do módulo 10 é o irmão dele |
| **Linux Internals** | Paralelo: as mesmas classes, outro kernel |
| **Detecção e Evasão** | ⚠ Ligação: o módulo 9 é a mesma aritmética de cobertura |
| **Fuzzing** | Ajuda: harness e triagem de crash |

---

## A linha do curso

| Este curso | ⚠ O que não está aqui |
|---|---|
| Encontrar o bug no **seu** alvo | Invasão de sistema de terceiro |
| **Reproduzir** com taxa medida | Publicar exploit funcional |
| **Reportar** a primitiva | Vender ou usar a cadeia até `SYSTEM` |
| Reconhecer e **detectar** `BYOVD` | Usar um `BYOVD` conhecido |
| Endurecer a frota | — |

⚠ **A distinção não é burocracia — é o que faz a área existir.** A vulnerabilidade que você achar num kernel que não é seu é achado de outra pessoa.

---

## Arquivos do curso

```
curso-windows-pesquisa/
├── README.md          ← este arquivo
├── 00-ementa.md       ← ementa completa
├── modulo-01.md ... modulo-12.md
├── avaliacoes.md      ← banco de questões
└── glossario.md       ← termos do curso
```

---

*Material didático original. Todo alvo é driver escrito pelo aluno, em VM própria, com snapshot e
Driver Verifier. Nenhum material que ensine atacar sistema de terceiro.*
