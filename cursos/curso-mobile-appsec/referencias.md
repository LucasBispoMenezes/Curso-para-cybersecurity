# Referências — Mobile Application Security: Análise e Pesquisa de Vulnerabilidades

**Padrões abertos, documentação oficial e material público que sustentam o curso**

---

## Como este arquivo funciona

⚠ **Todas as referências são públicas e abertas** — padrões de indústria, documentação oficial de plataforma e projetos open source.

⚠ **O curso é material original:** nenhum trecho de obra comercial foi reproduzido. As referências servem para **aprofundamento** e **verificação** — e cada módulo indica quais usar.

⚠ **Nota sobre o laboratório:** nenhuma referência deste arquivo aponta para aplicativo ou API de terceiro como alvo. ⚠ O alvo do curso é o app **escrito pelo aluno**, com **servidor próprio**.

---

## Módulo 1 — Modelagem de ameaças

| Referência | O que ela cobre |
|---|---|
| **OWASP MASVS** (mas.owasp.org) | ⚠ O padrão de verificação de segurança mobile — a base do curso |
| **OWASP MASTG** (mas.owasp.org/MASTG) | ⚠ O guia de teste — com procedimentos por plataforma |
| **OWASP Threat Modeling** (owasp.org) | O método de modelagem, adaptável a mobile |
| **Apple Platform Security** (support.apple.com/guide/security) | O modelo do iOS, do ponto de vista de quem investiga |
| **Android Security** (source.android.com/docs/security) | O modelo do Android |

⚠ **O que conferir:** o `MASVS` na categoria de **autorização** — ⚠ é ele que sustenta a pergunta central deste curso.

---

## Módulo 2 — Sessão e identidade

| Referência | O que ela cobre |
|---|---|
| **MASVS — `AUTH`** (mas.owasp.org) | ⚠ Requisitos de autenticação e sessão |
| **MASTG — testes de autenticação** | ⚠ Procedimentos por plataforma |
| **OWASP Session Management Cheat Sheet** | O ciclo de vida de sessão, independente de plataforma |
| **OAuth 2.0 Security Best Current Practice** (IETF) | ⚠ Tokens, rotação e revogação |
| **RFC 6749 / 6750** (OAuth / Bearer) | O que o token é, e como se apresenta |
| **Apple — `Keychain Services`** | ⚠ Onde o token deve viver no iOS |
| **Android — `EncryptedSharedPreferences`** | ⚠ Onde o token deve viver no Android |

⚠ **O que conferir:** o `BCP` do OAuth sobre **revogação** — ⚠ é ele que fundamenta o timestamp de senha.

---

## Módulo 3 — Armazenamento

| Referência | O que ela cobre |
|---|---|
| **MASVS — `STORAGE`** | ⚠ O que **não** deve ser guardado no cliente |
| **MASTG — testes de armazenamento** | ⚠ Onde procurar, por plataforma |
| **Android — `Data and file storage`** | Estrutura interna, externa e escopo |
| **Apple — `File System Programming Guide`** | ⚠ O container, e `Data Protection` por arquivo |
| **Apple — `NSFileProtectionKey`** | ⚠ As classes de proteção |
| **Android — `Auto Backup`** | ⚠ O que sai com `allowBackup` |
| **Apple — `Keychain` e `ThisDeviceOnly`** | ⚠ O que decide sobre backup |

⚠ **O que conferir:** a documentação de **Auto Backup** — ⚠ é ela que sustenta o achado de maior alcance no Android.

---

## Módulo 4 — O que o servidor confia

| Referência | O que ela cobre |
|---|---|
| **OWASP API Security Top 10** (owasp.org/API-Security) | ⚠ `BOLA`, `BFLA`, `BOPLA` — os padrões deste módulo em forma de lista |
| **OWASP ASVS** (owasp.org/www-project-application-security-verification-standard) | ⚠ Requisitos verificáveis por controle |
| **MASVS — `AUTH` e `NETWORK`** | Autorização no servidor, do ponto de vista mobile |
| **OWASP Cheat Sheet — Authorization** | ⚠ Onde a decisão de acesso deve viver |
| **OWASP Cheat Sheet — Input Validation** | ⚠ Repetir a validação no servidor |

⚠ **O que conferir:** a descrição de `API1` e `API5` — ⚠ são exatamente os padrões 1 e 3 deste módulo, com vocabulário de API.

---

## Módulo 5 — TLS e pinning

| Referência | O que ela cobre |
|---|---|
| **MASVS — `NETWORK`** | ⚠ Requisitos de comunicação |
| **MASTG — testes de rede** | ⚠ Procedimentos, incluindo pinning |
| **OWASP — Certificate Pinning** | ⚠ O que o pinning cobre, e o que não |
| **Android — `Network Security Configuration`** | ⚠ A política de TLS no app |
| **Apple — `NSAppTransportSecurity`** | ⚠ A política de TLS no iOS |
| **RFC 8446 (TLS 1.3)** | O que o protocolo garante |
| **`mitmproxy`** (docs.mitmproxy.org) | ⚠ O instrumento de interceptação |

⚠ **O que conferir:** a documentação do `ATS` — ⚠ é ela que define o que `NSAllowsArbitraryLoads` **realmente** permite.

---

## Módulo 6 — Invocação, `deep links` e `WebView`

| Referência | O que ela cobre |
|---|---|
| **MASVS — `PLATFORM`** | ⚠ Comunicação entre apps e superfície de componente |
| **MASTG — testes de plataforma** | ⚠ Procedimentos por plataforma |
| **Android — `Intents and Intent Filters`** | ⚠ `exported` e o contrato de componente |
| **Android — `WebView` security** | ⚠ `addJavascriptInterface` e as flags de acesso |
| **Apple — `Custom URL Schemes`** | ⚠ A superfície de entrada no iOS |
| **Apple — `WKScriptMessageHandler`** | ⚠ A ponte entre web e nativo |
| **Deep Link Hijacking** (material público) | ⚠ O fenômeno, descrito pela comunidade |

⚠ **O que conferir:** a documentação de segurança do `WebView` no Android — ⚠ ela lista explicitamente o que cada flag permite.

---

## Módulo 7 — Lógica de negócio

| Referência | O que ela cobre |
|---|---|
| **OWASP API Security Top 10 — `API6`** | ⚠ Acesso irrestrito a fluxos de negócio |
| **OWASP Cheat Sheet — Business Logic** | ⚠ As classes: ordem, limite, repetição |
| **MASVS — `RESILIENCE`** | Robustez, do ponto de vista de defesa |
| **Idempotency-Key** (IETF draft) | ⚠ A correção para operação não atômica |
| **OWASP — Race Conditions** | ⚠ A classe, com método de teste |

⚠ **O que conferir:** a descrição de `API6` — ⚠ é o vocabulário de indústria para a divergência de regra.

---

## Módulo 8 — Anti-tampering e integridade

| Referência | O que ela cobre |
|---|---|
| **MASVS — `RESILIENCE`** | ⚠ O que se pode prometer com proteção local |
| **MASTG — testes de resiliência** | ⚠ Procedimentos, incluindo detecção de root |
| **Apple — `DeviceCheck` / `App Attest`** | ⚠ ⚠ **A proteção estrutural** |
| **Google — `Play Integrity API`** | ⚠ O equivalente no Android |
| **Android — `SafetyNet` (legado)** | A referência anterior, hoje substituída |
| **OWASP — Anti-Tampering** | O que a indústria considera adequado |

⚠ **O que conferir:** o `MASVS` na resiliência — ⚠ ele é explícito sobre **não** se poder prometer impedimento com proteção local.

---

## Módulo 9 — Instrumentação

| Referência | O que ela cobre |
|---|---|
| **`Frida`** (frida.re/docs) | ⚠ Android e iOS — `Java`, `ObjC`, `Interceptor` |
| **`objection`** (github.com/sensepost/objection) | Atalhos sobre `Frida` |
| **MASTG — testes dinâmicos** | Como a indústria estrutura a análise dinâmica |
| **`mitmproxy`** | Interceptação, com scripts |
| **`lldb`** (lldb.llvm.org) | ⚠ Nível A do iOS |
| **Android — `adb` e `run-as`** | ⚠ Os comandos que dispensam `root` |

⚠ **O que conferir:** a API de `Interceptor` — ⚠ é ela que sustenta o controle experimental do módulo.

---

## Módulos 10 a 12 — Reprodução, correção e reporte

| Referência | O que ela cobre |
|---|---|
| **MASTG — estrutura de relatório** | ⚠ O formato que a indústria espera |
| **OWASP — Vulnerability Reporting** | Como escrever achado reproduzível |
| **CVSS** (first.org/cvss) | ⚠ Vocabulário de severidade — e o que ele **não** captura em mobile |
| **CWE** (cwe.mitre.org) | ⚠ Classificação de fraqueza |
| **OWASP ASVS — verificação** | Requisitos verificáveis, por controle |

⚠ **A nota sobre o `CVSS`:** ⚠ ele tem métricas de **exploração** e **impacto** — ⚠ e **não captura** a **duração** nem o **pre-requisito** do mobile. ⚠ É por isso que este curso usa **nível** e **janela** em vez de apenas escore.

---

## Referências transversais

| Referência | Onde serve |
|---|---|
| **OWASP MASVS / MASTG** | ⚠ A espinha do curso inteiro |
| **OWASP Mobile Top 10** | A lista de risco, para alinhamento de vocabulário |
| **OWASP API Security Top 10** | ⚠ O módulo 4, na forma de lista |
| **OWASP ASVS** | Requisitos verificáveis |
| **Apple Security Releases** | ⚠ O que foi corrigido, por versão |
| **Android Security Bulletins** | ⚠ Idem — para acompanhar patching |
| **CWE Mobile** (cwe.mitre.org) | Vocabulário de fraqueza |

⚠ **A quinta e a sexta são as mais úteis para acompanhar correções:** ⚠ o que foi corrigido diz **o que era bug** — o mesmo raciocínio do `variant hunting` do curso de Pesquisa em Windows.

---

## Ferramentas do curso

| Ferramenta | ⚠ Papel |
|---|---|
| `curl` | ⚠ ⚠ **O instrumento principal** — a maioria dos achados é nível 1 |
| `mitmproxy` | Interceptar, alterar e repetir |
| `frida` / `objection` | ⚠ Medir — observação e **controle** |
| `adb` / `run-as` | Android — invocar e ler sem `root` |
| `simctl` / `devicectl` | iOS — instalar, abrir URL, container |
| `pytest` / `requests` | ⚠ O teste de regressão |
| `sqlite3` | Ler banco extraído |
| `plutil` | Leitura de `plist` |
| `Flask` | ⚠ **O servidor do laboratório** |
| `jadx` / `strings` | Leitura do código — Cursos 1 e 2 |

⚠ **A primeira linha é a que surpreende:** ⚠ neste curso, **`curl` é a ferramenta principal** — ⚠ porque a pergunta é **o que o servidor confia**, e requisição não precisa de `root`.

---

## Sobre o laboratório do curso

⚠ **O aplicativo-alvo é escrito pelo aluno**, e o **servidor também**. O curso fornece a estrutura — endpoints, componentes, armazenamento, deep links, `WebView` — e o aluno investiga **o que escreveu**.

⚠ **O material descreve o mecanismo de proteção e de detecção** (módulo 8) para que o aluno saiba **avaliar o próprio app**, e **não** contornar proteção de app alheio.

⚠ **Os labs não foram testados em ambiente isolado.** Valide cada um antes de publicar ou usar em aula.

---

*Material original do curso. Todas as referências são públicas e abertas; nenhum trecho de obra comercial
protegida foi reproduzido.*
