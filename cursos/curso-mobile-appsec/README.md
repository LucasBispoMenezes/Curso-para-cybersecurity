# Mobile Application Security: Análise e Pesquisa de Vulnerabilidades

**Curso · 40 horas · 12 módulos · Nível: especialista**

---

## Sobre este curso

Este é o **Curso 3** da trilha de Mobile Security — e é **vertical**: atravessa Android **e** iOS.

A afirmação que organiza tudo:

> **O app é do cliente, e o cliente não é confiável. Toda decisão de segurança que vive nele
> pode ser alterada — e o achado não é "o app decide", é "o servidor aceita".**

⚠ **A pergunta que percorre os doze módulos:**

> **Onde este app confia em dado que não devia — e quem valida?**

⚠ **É a mesma do `Web Apps e APIs`, porque o mobile é a mesma fronteira em outro lugar:** lá era o navegador; aqui é o **app instalado** — e o app instalado **pode ser manipulado**.

---

## Posição na trilha de Mobile Security

```
   Android Security Research ──┐
    (Curso 1: ler Android)     │
                               ├──► ⚠ ESTE CURSO
   iOS Security Research ──────┤     (investigar comportamento)
    (Curso 2: ler iOS)         │
                               │
   Web Apps e APIs ────────────┘
    (autorização, sessão, API)
```

⚠ **Os Cursos 1 e 2 são horizontais** (uma plataforma cada) e **independentes entre si**. ⚠ **Este é vertical** — e por isso é o único que **depende dos dois**.

⚠ **Como este curso trata o que os outros aprofundaram:**

| Conceito | ⚠ Onde é aprofundado | Aqui |
|---|---|---|
| `Mach-O`, `DEX`, `smali` | ⚠ **Cursos 1 e 2** | ⚠ **Não se repete** |
| `entitlement`, `Keychain` | ⚠ **Curso 2** | Usa — para investigar o que vaza |
| Componentes, `IPC` | ⚠ **Curso 1** | ⚠ **Investiga a autorização** |
| ⚠ **Autorização, sessão, API** | ⚠ **Web Apps e APIs** | ⚠ **Aplica ao cliente instalado** |
| ⚠ **Anti-tampering, TLS** | ⚠ **Aqui** | ⚠ Avaliação, não contorno |

---

## Pré-requisitos

| Pré-requisito | Por quê |
|---|---|
| **Android Security Research** | ⚠ Ler o app Android |
| **iOS Security Research** | ⚠ Ler o app iOS |
| **Segurança de Aplicações Web e APIs** | ⚠ Autorização, sessão, API |
| **Redes** *(ajuda)* | TLS, proxy, certificado |
| **Criptografia Aplicada** *(ajuda)* | aleatoriedade, MAC, assinatura |
| **Pesquisa em Segurança** *(ajuda)* | hipótese, medição, reporte |

⚠ **Sem os três primeiros, o curso não existe.** Aqui não se ensina `Mach-O` nem `DEX` — assume-se que você sabe.

---

## Estrutura

| # | Módulo | Horas | O que entrega |
|---|---|---|---|
| 1 | [Modelagem de ameaças mobile](modulo-01.md) | 3 | ativo, ator, e o que o atacante controla |
| 2 | [Autenticação, sessão e identidade](modulo-02.md) | 4 | onde a sessão vive, e o que a invalida |
| 3 | [Armazenamento inseguro](modulo-03.md) | 3 | o que **não deveria** estar lá |
| 4 | [**APIs e o que o servidor confia**](modulo-04.md) | 4 | ⚠ **o núcleo** — os cinco padrões |
| 5 | [TLS e `pinning`](modulo-05.md) | 3 | o que cobrem, e o que passa por fora |
| 6 | [`Deep links`, `WebView` e componentes](modulo-06.md) | 4 | a superfície de invocação |
| 7 | [Validação e lógica de negócio](modulo-07.md) | 4 | as sete classes, com taxa |
| 8 | [Anti-tampering e integridade](modulo-08.md) | 3 | ⚠ o que a proteção **muda** |
| 9 | [Instrumentação aplicada](modulo-09.md) | 3 | medir, não demonstrar |
| 10 | [Reprodução e causa-raiz](modulo-10.md) | 3 | ⚠ **o caminho de fora**, e a causa |
| 11 | [Impacto, correção e regressão](modulo-11.md) | 3 | ⚠ **a janela de exposição** |
| 12 | [Projeto final](modulo-12.md) | 3 | pesquisa completa e relatório |

**Ordem de leitura:** linear. ⚠ **Os módulos 1 e 2 são a base; o 4 é o núcleo; os módulos 10 a 12 são o ciclo de entrega.**

---

## O laboratório

⚠ **Este curso exige os dois ambientes dos Cursos 1 e 2, e acrescenta um terceiro:**

```
   ANDROID (Curso 1)    iOS (Curso 2)      ⚠ O SERVIDOR
   ─────────────────    ─────────────      ────────────
   APK, componentes     IPA, Keychain      ⚠ CONTROLADO por voce
   Frida, run-as        lldb, jailbreak    ⚠ e' onde a confianca
                                            e' MEDIDA
```

⚠ **A terceira coluna é a diferença central deste curso:** ⚠ sem um **servidor próprio**, metade dos achados **não é medível**.

```bash
mkdir -p ~/mobile-lab && cd ~/mobile-lab
python3 -m venv .venv && source .venv/bin/activate
pip install flask requests mitmproxy frida-tools pytest

# ⚠ o servidor do laboratorio — escrito por VOCE
python api/servidor.py &
```

⚠ **Três regras:** o alvo é **o app do laboratório, no seu aparelho, e o servidor é seu**; ⚠ **todo achado precisa do caminho de fora**; ⚠ e **os labs não foram testados em ambiente isolado** — valide antes de publicar.

⚠ **A coluna que existe em todo relatório:** ⚠ **nível 1** (de fora, sem instrumento — **real**), ⚠ **nível 2** (de fora, com instrumento — **condicionado**), ⚠ **nível 3** (só com instrumento — **anexo**).

---

## Conexões com os outros cursos

| Curso | Ligação |
|---|---|
| **Android Security Research** | ⚠ Pré-requisito: ler o app Android |
| **iOS Security Research** | ⚠ Pré-requisito: ler o app iOS |
| **Web Apps e APIs** | ⚠ Pré-requisito: autorização, sessão, API |
| **Redes** | Ajuda: TLS, proxy |
| **Criptografia Aplicada** | Ajuda: aleatoriedade, MAC |
| **Pesquisa em Segurança** | Ajuda: hipótese, medição, reporte |
| **Detecção e Evasão** | Ligação: medir o que a defesa cobre |

---

## Arquivos do curso

```
curso-mobile-appsec/
├── README.md          ← este arquivo
├── 00-ementa.md       ← ementa completa
├── modulo-01.md ... modulo-12.md
├── avaliacoes.md      ← banco de questões
├── glossario.md       ← termos do curso
└── referencias.md     ← OWASP MASVS/MASTG e material aberto
```

---

*Material didático original. Todo alvo é aplicativo escrito pelo aluno, com servidor próprio, em aparelho
próprio. Nenhum material que ensine atacar aplicação de terceiro.*
