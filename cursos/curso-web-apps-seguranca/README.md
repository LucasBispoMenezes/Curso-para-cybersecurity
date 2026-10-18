# Segurança de Aplicações Web e APIs

**Curso · 40 horas · 12 módulos · Nível: avançado**

---

## Sobre este curso

Este curso ensina a **encontrar, entender e corrigir** falhas em aplicações web e APIs.

A pergunta que organiza tudo, repetida em cada camada:

> **Em que ponto este dado cruza uma fronteira — e quem valida depois de cruzar?**

⚠ **É a mesma pergunta do `Linux Internals`** (onde o kernel confia no userspace) **e do `Windows Internals`** (onde o objeto confia no handle). Aqui, a fronteira é entre **componentes de uma aplicação**: o navegador e o servidor, o proxy e o backend, o serviço e a API externa.

⚠ **E a razão de o curso terminar no código, e não no achado:** as listas públicas de risco nomeiam **classes**. Quem quer corrigir precisa da **causa**, e a causa está em uma linha de código — não em uma categoria.

---

## Pré-requisitos

| Pré-requisito | Por quê |
|---|---|
| **Redes** | HTTP, header, TLS, DNS, `tcpdump`, proxy |
| **Linux para Segurança** | servidor, arquivo, permissão, processo, contêiner |
| **Criptografia Aplicada** *(ajuda)* | sessão, token, TLS — módulos 3 e 6 |
| **HTTP Smuggling** *(ajuda)* | aprofundamento do módulo 10 |

⚠ **Sem os dois primeiros, você trava no módulo 1.**

---

## Estrutura

| # | Módulo | Horas | O que entrega |
|---|---|---|---|
| 1 | [Arquitetura e modelo de confiança](modulo-01.md) | 3 | as seis fronteiras, e onde o dado muda de mão |
| 2 | [Metodologia e instrumentação](modulo-02.md) | 3 | observação, hipótese, evidência; o método de comparação |
| 3 | [Autenticação e sessões](modulo-03.md) | 4 | os cinco momentos, rotação, destruição, recuperação |
| 4 | [Autorização e controle de acesso](modulo-04.md) | 4 | objeto, função e propriedade — IDOR, BFLA, mass assignment |
| 5 | [Injeções no servidor](modulo-05.md) | 4 | SQL, comando, caminho; causa-raiz × sintoma × impacto |
| 6 | [Segurança do navegador](modulo-06.md) | 4 | contexto de saída, XSS, CSRF, CORS, CSP |
| 7 | [SSRF, uploads e integrações](modulo-07.md) | 3 | destino e capacidade de saída; XXE; webhook |
| 8 | [Fundamentos de segurança de APIs](modulo-08.md) | 4 | a matriz identidade × endpoint × dado; inventário |
| 9 | [GraphQL, serialização e contratos](modulo-09.md) | 3 | autorização por campo; contrato × comportamento |
| 10 | [Lógica, concorrência e comportamento emergente](modulo-10.md) | 4 | os quatro grupos; atomicidade; cache |
| 11 | [Análise de código, causa-raiz e correção](modulo-11.md) | 3 | rastrear, corrigir, provar; o teste de regressão |
| 12 | [Projeto final](modulo-12.md) | 2 | aplicação com defeitos não anunciados e relatório |

**Ordem de leitura:** linear. Os módulos 3 e 4 são a base dos 8 e 9; o 2 é o método que todos assumem; o 11 é o ciclo que o 12 cobra inteiro.

---

## O laboratório

⚠ **A decisão de desenho: a aplicação é escrita por você.**

| Por quê | Consequência |
|---|---|
| ⚠ **O módulo 11 exige correção** | Não se corrige o que não se tem |
| ⚠ **O módulo 12 entrega regressão** | O teste precisa de código com teste |
| **A trilha inteira faz assim** | No kernel, o driver é seu; aqui, o servidor é seu |
| **Causa-raiz em vez de sintoma** | Você vê a linha que errou, não só a resposta |

Cada módulo traz uma aplicação pequena, **com o defeito daquele módulo** — ela não é "a certa", é a que tem o bug, de propósito. No módulo 12, a aplicação é maior e os defeitos **não são anunciados**.

```bash
mkdir -p ~/web-lab && cd ~/web-lab
python3 -m venv .venv && source .venv/bin/activate
pip install flask pytest requests
```

⚠ **O alvo é local e é seu.** `127.0.0.1`, na sua rede. Nenhum lab aponta para aplicação de terceiro — nem pública, nem de cliente.

⚠ **O anexo de alvos públicos é aprofundamento opcional.** `OWASP Juice Shop` e `crAPI` treinam reconhecimento — e **não substituem** o ciclo de correção, porque você não tem o código.

⚠ **Os labs não foram testados em ambiente isolado.** Valide cada um antes de publicar ou usar em aula.

---

## Conexões com os outros cursos da trilha

| Curso | Ligação |
|---|---|
| **Redes** | Pré-requisito: HTTP, header, TLS, DNS, proxy |
| **Linux para Segurança** | Pré-requisito: servidor, arquivo, permissão, contêiner |
| **Criptografia Aplicada** | Ajuda: TLS, assinatura de token, aleatoriedade de sessão |
| **HTTP Smuggling** | ⚠ **Aprofundamento** do módulo 10 — framing e desync |
| **Parser Differentials** | ⚠ **Aprofundamento** do módulo 10 — camadas que discordam |
| **Detecção e Evasão** | Ligação: como detectar o que este curso encontra |
| **Enumeração Esotérica** | Ligação: superfície — lá infraestrutura, aqui aplicação |
| **Pesquisa em Segurança** | Ligação: método de hipótese e reporte |
| **Linux Internals** | Paralelo: a mesma tese, em outra fronteira |

⚠ **A relação com `HTTP Smuggling` é deliberada.** O módulo 10 toca **fronteira entre parsers** — mas o curso de smuggling trata disso como **tema central**, com as dez variantes, o harness e a medição de desync. Aqui o assunto aparece como **uma classe entre outras** de comportamento emergente, e o material aponta para lá. **Nenhum dos dois repete o outro.**

---

## Cobertura das listas públicas

| Lista | Onde |
|---|---|
| **`OWASP Top 10`** (web) | A01 → 4 e 8 · A02 → 3 · A03 → 5 e 9 · A04 → 10 · A05 → 1, 7, 11 · A06 → 11 · A07 → 3 · A08 → 9 · A09 → 11 · A10 → 7 |
| **`OWASP API Top 10`** | API1 → 4 e 8 · API2 → 3 · API3 → 4 e 8 · API4 → 8 · API5 → 4 · API6 → 10 · API7 → 7 · API8 → 7 e 11 · API9 → 8 · API10 → 7 |
| ⚠ **`OWASP Top 10 LLM`** | **não coberto** — prompt injection, RAG e tool abuse pertencem a outro curso |

---

## Arquivos do curso

```
curso-web-apps-seguranca/
├── README.md          ← este arquivo
├── 00-ementa.md       ← ementa completa
├── modulo-01.md ... modulo-12.md
├── avaliacoes.md      ← banco de questões
└── glossario.md       ← termos do curso
```

---

*Material didático original. Toda aplicação-alvo é escrita pelo aluno, em ambiente local isolado, na
própria rede. Nenhum material que ensine atacar aplicação de terceiro.*
