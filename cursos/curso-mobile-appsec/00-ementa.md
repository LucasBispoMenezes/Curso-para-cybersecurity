---
title: "Mobile Application Security: Análise e Pesquisa de Vulnerabilidades"
nivel: especialista
tags: [mobile, android, ios, api, tls, deeplink, webview, anti-tampering, causa-raiz]
---
# Mobile Application Security: Análise e Pesquisa de Vulnerabilidades

**Ementa do curso · 40 horas · 12 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **App** | Sabe **ler** um APK e um `IPA` | ⚠ **Sabe investigar o comportamento** |
| **Ameaça** | "o app é inseguro" | ⚠ **Modelo de ameaça com ativo e ator** |
| **Sessão** | Sabe que existe | ⚠ Sabe **onde ela é guardada, e o que a invalida** |
| **Dado** | Sabe onde o app guarda | ⚠ **Sabe o que ele não deveria guardar** |
| **API** | Sabe que o app fala com servidor | ⚠ **Sabe se o servidor confia no app** |
| **Pinning** | "tem pinning" | ⚠ **Sabe o que ele cobre, e o que não cobre** |
| **Deep link** | É uma URL | ⚠ ⚠ **É superfície de autorização** |
| **WebView** | É um navegador dentro | ⚠ **É a fronteira entre dois mundos** |
| **Proteção** | "tem anti-tampering" | ⚠ Sabe o que ela **consegue** e o que **não** |
| **Ferramenta** | Instrumenta | ⚠ **Mede**, com o caminho de fora |
| **Resultado** | Lista de achados | ⚠ **causa-raiz, impacto, correção e regressão** |
| **Mentalidade** | "achei um bug" | **"onde o app confia no que não devia?"** |

**Pré-requisito duro:** curso de **Android Security Research** (Curso 1) · curso de **iOS Security Research** (Curso 2) · curso de **Segurança de Aplicações Web e APIs** (autorização, sessão, API, contexto de saída).
**Ajuda muito:** curso de **Redes** (TLS, certificado, proxy) · curso de **Criptografia Aplicada** (aleatoriedade, MAC, assinatura) · curso de **Pesquisa em Segurança** (hipótese, medição, reporte).

⚠ **Sem os três primeiros, o curso não existe.** Os Cursos 1 e 2 ensinam a **ler** um app; este ensina a **investigar** o comportamento. ⚠ **Não há repetição:** aqui não se ensina `Mach-O`, `DEX`, `entitlement` nem `smali` — assume-se que você sabe.

---

## Por que este curso existe

⚠ **A afirmação que organiza o curso:**

> **Investigar um app mobile não é ler o app. É descobrir onde ele confia no que não devia —
> e provar isso pelo caminho que um atacante de verdade percorre.**

⚠ **A diferença em relação aos Cursos 1 e 2, e ela é o desenho do curso:**

| Curso 1 e 2 | ⚠ Este curso |
|---|---|
| ⚠ **Ler** o app | ⚠ ⚠ **Investigar o comportamento** |
| Estático e dinâmico | ⚠ **Reprodução pelo caminho externo** |
| Instrumentar para entender | ⚠ **Instrumentar para medir** |
| "o app faz X" | ⚠ **"um terceiro consegue fazer Y"** |
| Relatório de análise | ⚠ **Relatório com causa-raiz, impacto e correção** |

⚠ **E a razão de o curso existir separado:** ⚠ os Cursos 1 e 2 terminam em **análise** — *o app foi compreendido*. ⚠ Este termina em **achado** — com o **caminho reproduzível**, a **causa-raiz**, o **impacto medido** e a **regressão**.

⚠ **A pergunta que percorre os doze módulos:**

> **Onde este app confia em dado que não devia — e quem valida?**

⚠ **É a mesma do `Web Apps e APIs`, e ela se repete aqui porque o mobile é a mesma fronteira em outro lugar:** ⚠ o cliente. ⚠ Lá, era o navegador; ⚠ aqui, é o **app instalado** — e o app instalado **pode ser manipulado**.

⚠ **A tese que o curso defende, e que resume tudo:**

> **O app é do cliente, e o cliente não é confiável. Toda decisão de segurança que vive no
> app pode ser alterada por quem tem o aparelho.**

⚠ **É a conclusão do módulo 10 do Curso 1 e do módulo 9 do Curso 2** — e aqui ela vira **método**: ⚠ cada achado precisa responder **o que o servidor faz** quando o app mente.

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. **Construir um modelo de ameaça** mobile — ativo, ator, e o que o atacante controla.
2. Avaliar **autenticação e sessão**, e onde elas cedem.
3. Reconhecer **armazenamento inseguro** — e o que **não deveria** estar ali.
4. ⚠ Avaliar **se o servidor confia no app**, e o que decorre disso.
5. Medir **validação de TLS e pinning** — o que cobrem e o que não.
6. Investigar **deep links** como superfície de **autorização**.
7. Reconhecer **`WebView`** como fronteira entre dois mundos.
8. ⚠ Encontrar falha de **validação e de lógica de negócio** que sobrevive no servidor.
9. Avaliar **anti-tampering** pelo que ele **consegue**, não pelo que promete.
10. ⚠ **Reproduzir** pelo **caminho de fora**, com **medida**.
11. Rastrear até a **causa-raiz**, e escrever a **correção** com **teste de regressão**.
12. **Produzir o relatório** — caminho, evidência, impacto, correção e limitações.

---

## O laboratório

⚠ **O curso exige os dois ambientes dos Cursos 1 e 2, e acrescenta um terceiro elemento:**

```
   ANDROID (Curso 1)      iOS (Curso 2)        ⚠ O SERVIDOR
   ─────────────────      ─────────────        ────────────
   APK, Frida,            IPA, lldb,           ⚠ o app fala com
   componentes            Keychain                ELE — e é ele
                                                  que decide
   ⚠ Nivel A/B            ⚠ Nivel A/B          ⚠ CONTROLADO por voce
```

⚠ **A terceira coluna é o que este curso acrescenta, e é a diferença central:** ⚠ você precisa de **um servidor seu**, que responda às requisições do app. ⚠ Sem ele, **não há como medir** o que o servidor confia — e é aí que está metade dos achados.

⚠ **Por que o servidor é obrigatório, e não opcional:**

| Achado | ⚠ Exige servidor? |
|---|---|
| Sessão não invalidada no logout | ⚠ Sim — para ver que o token continua valendo |
| App decide autorização localmente | ⚠ ⚠ Sim — para ver que o servidor **não reconfirma** |
| Pinning cobre só parte do tráfego | ⚠ Sim — para ver a requisição não pinada |
| `Deep link` abre dado de outro | ⚠ Sim — para ver **quem** o servidor acha que pediu |

```bash
# ── O laboratório ───────────────────────────────────────────
mkdir -p ~/mobile-lab && cd ~/mobile-lab
python3 -m venv .venv && source .venv/bin/activate
pip install flask requests mitmproxy frida-tools

# ⚠ o servidor do laboratorio — escrito por VOCE
#    ele responde ao app, e e' onde a confianca e' medida
mkdir -p api && cat > api/servidor.py <<'EOF'
from flask import Flask, request, jsonify
import secrets, sqlite3
app = Flask(__name__)
TOKENS = {}
@app.post("/login")
def login():
    u = request.form.get("usuario")
    t = secrets.token_hex(16); TOKENS[t] = u
    return jsonify({"token": t, "papel": "usuario"})
@app.get("/perfil")
def perfil():
    t = request.headers.get("Authorization","").replace("Bearer ","")
    if t not in TOKENS: return jsonify({"erro":"401"}), 401
    return jsonify({"usuario": TOKENS[t], "saldo": 100})
@app.post("/logout")
def logout():
    # ⚠ O DEFEITO: nao invalida o token
    return jsonify({"ok": True})
if __name__ == "__main__": app.run(host="0.0.0.0", port=5000)
EOF
python api/servidor.py &
```

⚠ **Três regras do laboratório:**

⚠ **O alvo é o app do laboratório, no seu aparelho, e o servidor é seu.** ⚠ Nenhum lab aponta para app ou API de terceiro.

⚠ **Todo achado precisa do caminho de fora.** ⚠ Instrumentar prova que o código **pode** ser desviado; o achado exige **demonstrar que um terceiro alcança** — e é essa a régua do curso.

⚠ **Os labs não foram testados em ambiente isolado.** Valide cada um antes de publicar ou usar em aula.

---

## Como este curso se conecta aos outros

| Curso | Ligação |
|---|---|
| **Android Security Research** | ⚠ Pré-requisito: ler o app Android |
| **iOS Security Research** | ⚠ Pré-requisito: ler o app iOS |
| **Web Apps e APIs** | ⚠ Pré-requisito: autorização, sessão, API |
| **Redes** | Ajuda: TLS, proxy, certificado |
| **Criptografia Aplicada** | Ajuda: aleatoriedade, MAC, assinatura |
| **Pesquisa em Segurança** | Ajuda: hipótese, medição, reporte |
| **Detecção e Evasão** | Ligação: medir o que a defesa cobre |

⚠ **A relação com os Cursos 1 e 2 é a razão de este curso vir depois:** ⚠ eles são **horizontais** (uma plataforma cada); ⚠ este é **vertical** — atravessa as duas. ⚠ Por isso ele é o único que **depende dos dois**, e por isso os conceitos de plataforma aqui aparecem **breves**: ⚠ `Mach-O`, `DEX`, `entitlement` e `Keychain` **não se repetem** — só se usam.

---

## Módulos

| # | Módulo | Horas |
|---|---|---|
| 1 | Modelagem de ameaças mobile | 3 |
| 2 | Autenticação, sessão e identidade | 4 |
| 3 | Armazenamento inseguro de dados | 3 |
| 4 | Comunicação com APIs e o que o servidor confia | 4 |
| 5 | Validação de TLS e `pinning` | 3 |
| 6 | `Deep links`, `WebView` e comunicação entre componentes | 4 |
| 7 | Validação de entrada e lógica de negócio | 4 |
| 8 | Anti-tampering e mecanismos de integridade | 3 |
| 9 | Instrumentação aplicada à investigação | 3 |
| 10 | Reprodução e identificação da causa-raiz | 3 |
| 11 | Impacto, correção e testes de regressão | 3 |
| 12 | Projeto final: pesquisa completa | 3 |

**Ordem de leitura:** linear. ⚠ Os módulos 1 e 2 são a base; o 4 é o **núcleo**; os módulos 10 a 12 são o **ciclo de entrega**.

---

## Avaliação e encerramento

- `avaliacoes.md` — banco de questões por módulo, com resposta comentada.
- `glossario.md` — os termos do curso, definidos uma vez, em ordem.
- `referencias.md` — `OWASP MASVS`/`MASTG` e material aberto.
- `README.md` — índice e ordem de leitura.

⚠ **A entrega do módulo 12 é o relatório de pesquisa**, com a coluna que este curso exige: ⚠ **o que o servidor faz quando o app mente**.

---

## Critérios de avaliação

| ✅ Qualifica | ⚠ Não qualifica |
|---|---|
| ⚠ **Caminho de fora**, reproduzível | demonstração com `Frida` |
| ⚠ **O que o servidor faz** | "o app decide localmente" |
| Causa raiz em **uma frase** | "falta validação" |
| Impacto **medido** | "crítico" sem número |
| ⚠ **Correção + teste de regressão** | "sanitizar a entrada" |
| Limitação declarada | silêncio sobre o não testado |

---

*Material didático original. Todo alvo é aplicativo escrito pelo aluno, com servidor próprio, em aparelho
próprio. Nenhum material que ensine atacar aplicação de terceiro.*
