---
title: "Segurança de Aplicações Web e APIs: Do Modelo de Confiança à Causa-Raiz"
nivel: avancado
tags: [web, api, autorização, injeção, ssrf, graphql, lógica, causa-raiz]
---
# Segurança de Aplicações Web e APIs

**Ementa do curso · 40 horas · 12 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **Arquitetura** | Vê "frontend e backend" | Desenha os limites de confiança e o caminho do dado |
| **Requisição** | Usa o navegador | Intercepta, repete, compara e documenta |
| **Sessão** | "tem cookie" | Sabe o ciclo de vida, a rotação e onde ele cede |
| **Acesso** | Testa com duas contas | Separa autorização por **objeto, função e propriedade** |
| **Injeção** | Roda ferramenta | Acha a causa no código, não o sintoma na resposta |
| **Cliente** | "tem XSS" | Identifica **o contexto** e a codificação que corrige |
| **API** | Lê a documentação | Compara contrato documentado com **comportamento real** |
| **Lógica** | Segue o fluxo previsto | Acha o fluxo que o autor **não previu** |
| **Código** | Não lê o fonte | Rastreia entrada até o ponto vulnerável |
| **Resultado** | lista de achados | **relatório com causa-raiz, correção e regressão** |
| **Mentalidade** | "o app tem um bug" | **"onde a aplicação confia em dado que não devia?"** |

**Pré-requisito duro:** curso de **Redes** (HTTP, TLS, DNS, `tcpdump`, proxy) · curso de **Linux para Segurança** (servidor, arquivo, permissão, processo, contêiner).
**Ajuda muito:** curso de **Criptografia Aplicada** (sessão, token, TLS — módulos 3 e 6) e curso de **HTTP Smuggling** (o módulo 10 aponta para lá).

⚠ **Sem os dois primeiros, você trava no módulo 1.** Este curso **usa** os dois — e não repete o que eles ensinam.

---

## Por que este curso existe

⚠ **A distinção que separa este curso dos outros de web:**

| Curso de web comum | Este curso |
|---|---|
| Catálogo de vulnerabilidade | ⚠ **O modelo de confiança** e onde ele cede |
| Termina na exploração | ⚠ **Termina na causa-raiz e na regressão** |
| Alvo pronto e conhecido | ⚠ **Aplicação que você escreve, quebra e corrige** |
| Lista de achado | ⚠ **Relatório com correção verificável** |
| Ferramenta responde | ⚠ **Ferramenta informa; o código confirma** |

⚠ **A tese do curso:**

> **Toda falha de aplicação web é a mesma pergunta, em camada diferente:** **em que ponto este dado
> cruza uma fronteira — e quem valida depois de cruzar?**

É a pergunta do curso de Linux Internals (onde o kernel confia no userspace) e do Windows Internals
(onde o objeto confia no handle). Aqui, a fronteira é **entre componentes de uma aplicação**: o
navegador e o servidor, o proxy e o backend, o serviço e a API externa.

⚠ **E a razão de o curso terminar no código, e não no achado:** o `OWASP Top 10` nomeia **classes**.
Quem quer corrigir precisa da **causa**, e a causa está em uma linha de código — não em uma categoria.

⚠ **O que o curso não é:** não é um curso de ferramenta, e não é um catálogo. Nenhum módulo começa
com "instale o scanner". Todo módulo começa com **onde a confiança está** e termina com **o teste que
prova a correção**.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. **Desenhar** a arquitetura de uma aplicação e marcar seus **limites de confiança**.
2. **Mapear** a superfície: rotas, parâmetros, formulários, endpoints, contratos.
3. **Formular hipótese testável** e separar observação de evidência.
4. Avaliar o **ciclo de vida de sessão** — criação, rotação, expiração e invalidação.
5. Distinguir autorização por **objeto, função e propriedade**, e testar as três.
6. Reconhecer **injeção** na origem, e escolher a correção estrutural.
7. Identificar o **contexto de interpretação** em falhas de cliente, e a codificação certa.
8. Avaliar **destino e capacidade de saída** em requisição feita pelo servidor.
9. Construir uma **matriz de endpoints, identidades e permissões** de uma API.
10. Comparar **contrato documentado** com comportamento observado.
11. Encontrar falha de **lógica e concorrência** fora do fluxo previsto.
12. **Rastrear entrada até o ponto vulnerável**, corrigir e criar o **teste de regressão**.

---

## O laboratório

⚠ **A decisão de desenho do curso: a aplicação é escrita por você.**

| Por quê | Consequência |
|---|---|
| ⚠ **O módulo 11 exige correção** | Não se corrige o que não se tem |
| ⚠ **O módulo 12 entrega regressão** | O teste precisa de código com teste |
| **A trilha inteira faz assim** | No kernel, o driver é seu; aqui, o servidor é seu |
| **Causa-raiz em vez de sintoma** | Você vê a linha que errou, não só a resposta |

```
   POR MÓDULO:                        NO MÓDULO 12:
   ┌──────────────────────────┐       ┌──────────────────────────┐
   │ app pequena, com os      │       │ app maior, com defeitos  │
   │ defeitos DAQUELE módulo  │       │ NÃO ANUNCIADOS           │
   │                          │       │                          │
   │ 1. sobe e mapeia         │       │ 1. mapeia e prioriza     │
   │ 2. encontra              │       │ 2. formula hipótese      │
   │ 3. corrige               │       │ 3. reproduz o mínimo     │
   │ 4. escreve o teste       │       │ 4. corrige e documenta   │
   └──────────────────────────┘       └──────────────────────────┘
```

```bash
# A base do laboratorio — o mesmo padrao em todos os modulos
mkdir -p ~/web-lab && cd ~/web-lab
python3 -m venv .venv && source .venv/bin/activate
pip install flask flask-login requests pytest sqlalchemy

# Alvo proprio: sobe local, so na sua rede
export FLASK_APP=app.py && flask run --host 127.0.0.1 --port 5000

# O proxy, para interceptar e comparar
# ⚠ qualquer proxy HTTP serve; o curso descreve o METODO, nao a ferramenta
```

⚠ **Três regras do laboratório:**

⚠ **O alvo é local e é seu.** `127.0.0.1`, na sua rede, na sua máquina. Nenhum lab aponta para aplicação de terceiro — nem a pública, nem a de cliente.

⚠ **O anexo de alvos públicos é aprofundamento opcional.** `OWASP Juice Shop` e `crAPI` são ótimos para treinar reconhecimento — e **não substituem** o ciclo de correção, porque você não tem o código.

⚠ **Cada módulo entrega a aplicação daquele módulo.** São doze aplicações pequenas, cada uma escrita para ter o defeito em discussão — e nenhuma delas é "a certa": todas têm o bug, de propósito.

⚠ **Os labs não foram testados em ambiente isolado.** Valide cada um antes de publicar ou usar em aula.

---

## Como este curso se conecta aos outros

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

⚠ **A relação com o `HTTP Smuggling` é a que mais importa, e ela é deliberada.** O módulo 10 toca
**fronteira entre parsers** — mas o curso de smuggling trata disso como **tema central**, com as dez
variantes e a medição de desync. Aqui, o assunto aparece como **uma classe entre outras** de
comportamento emergente, e o material aponta para lá. **Nenhum dos dois repete o outro.**

---

## Módulos

| # | Módulo | Horas |
|---|---|---|
| 1 | Arquitetura de aplicações web e modelo de confiança | 3 |
| 2 | Metodologia de investigação e instrumentação | 3 |
| 3 | Autenticação, sessões e identidade | 4 |
| 4 | Autorização e controle de acesso | 4 |
| 5 | Injeções no servidor | 4 |
| 6 | Segurança do navegador e camada cliente | 4 |
| 7 | SSRF, uploads e integrações externas | 3 |
| 8 | Fundamentos de segurança de APIs | 4 |
| 9 | GraphQL, serialização e contratos de API | 3 |
| 10 | Lógica de negócio, concorrência e comportamento emergente | 4 |
| 11 | Análise de código, causa-raiz e correção | 3 |
| 12 | Projeto final: investigação completa | 2 |

**Ordem de leitura:** linear. Os módulos 3 e 4 são a base dos módulos 8 e 9; o módulo 2 é o método que todos os outros assumem.

---

## Avaliação e encerramento

- `avaliacoes.md` — banco de questões por módulo, com resposta comentada.
- `glossario.md` — os termos do curso, definidos uma vez, em ordem.
- `README.md` — índice e ordem de leitura.

⚠ **A entrega do módulo 12 é o relatório:** causa-raiz, impacto demonstrado, prova de conceito
**controlada**, correção recomendada e teste de regressão. É o mesmo formato do módulo 11 do curso de
Linux Internals e do curso de Windows Internals — o curso inteiro converge para ele.

---

*Material didático original. Toda aplicação-alvo é escrita pelo aluno, em ambiente local isolado, na
própria rede. Nenhum material que ensine atacar aplicação de terceiro.*
