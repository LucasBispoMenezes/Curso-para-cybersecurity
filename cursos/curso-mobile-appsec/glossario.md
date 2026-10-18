# Glossário — Mobile Application Security: Análise e Pesquisa de Vulnerabilidades

**Termos do curso, definidos uma vez, em ordem alfabética**

---

## A

**`aceita-e-ignora`** — ⚠ O veredito mais traiçoeiro: o servidor **não recusa** o campo estranho **e não o usa**. O achado pode estar em outro lugar.

**`addJavascriptInterface`** — ⚠ Expõe métodos do app ao JavaScript. ⚠ A ponte **não tem origem**.

**`App Attest` / `DeviceCheck`** — Atestação por hardware. ⚠ Detecta **contas múltiplas no mesmo aparelho**, e **não se contorna** com app modificado.

**`attestation`** — ⚠ ⚠ **A única proteção que IMPEDE** — porque vive **no servidor**.

---

## B

**`backup`** — ⚠ Canal de saída que **não exige `root`**. No iOS, o que decide é `ThisDeviceOnly`; no Android, `allowBackup`.

---

## C

**Caminho de fora** — ⚠ ⚠ **A régua do curso.** Provar o achado como **terceiro** — sem `root`, sem instrumento.

**`Comando que outra pessoa roda`** — ⚠ Se precisa do seu ambiente, não é nível 1.

**Causa-raiz** — ⚠ Tem **duas metades:** o erro **e** onde a regra deveria estar.

**"Como li"** — ⚠ A coluna do Curso 1 — aqui virou **nível**.

**Controle (instrumentação)** — ⚠ Hook que **altera** o comportamento para medir. ⚠ Precisa ser declarado.

---

## D

**`deep link`** — Superfície de invocação por URL. ⚠ **Não traz credencial — pega carona na da vítima.**

**Duração (do impacto)** — ⚠ Componente que os relatórios de mobile esquecem.

---

## E

**Estado afirmado** — ⚠ Padrão 5: o app **afirma**, e o servidor **acredita**.

---

## F

**Ficha de ameaça** — ⚠ O instrumento do módulo 1 — ativo, ator, superfície, **pre-requisito** e **o servidor reconfirma?**

---

## G

**`grantUriPermissions`** — não é deste curso; pertence ao Curso 1.

---

## I

**Idempotência (`Idempotency-Key`)** — ⚠ Correção para operação não atômica. ⚠ O cliente envia a chave, e o servidor **deduplica**.

**Instrumentação (aqui)** — ⚠ **Medir**, não demonstrar. ⚠ O hook é o **controle**.

---

## J

**Janela (de exposição)** — ⚠ ⚠ **Por quanto tempo o achado segue vivo** depois de corrigido no servidor. ⚠ Decisão de negócio.

---

## L

**Log** — ⚠ Canal de saída que **não exige `root`**. ⚠ Token no log é achado **real**.

---

## M

**MFA (no mobile)** — ⚠ Falha se validado **no app**, ou se a sessão não **rotaciona**.

---

## N

**Nível (1, 2, 3)** — ⚠ ⚠ **A coluna do curso.** 1 = de fora, sem instrumento (**achado**); 2 = de fora, com instrumento (**condicionado**); 3 = só com instrumento (**anexo**).

---

## O

**Origem (`SourceApplicationKey`)** — ⚠ Quem abriu o app. ⚠ Quase nunca é lida.

---

## P

**Padrões de confiança indevida** — ⚠ Os cinco: identidade no corpo, valor de negócio, papel, validação só no app e **estado afirmado**.

**`PendingIntent`** — ⚠ Sem `FLAG_IMMUTABLE`, outro app **preenche** o `Intent`. ⚠ **Autoridade emprestada**.

**Pinning** — ⚠ Reduz o conjunto de certificados aceitos. ⚠ **Não cobre** SDKs, `WebView` nem o dono do aparelho.

**Pre-requisito** — ⚠ O que o atacante precisa ter. ⚠ Define a **gravidade**.

---

## R

**Requisição impossível** — ⚠ O que o app real **nunca** manda. ⚠ É a base da **detecção no servidor**.

---

## S

**Sessão** — ⚠ No mobile, **o app escolhe onde guardar** — e o app é do usuário.

**`signed` / assinatura local** — ⚠ ⚠ Verificação **no app** — encarece, **não impede**.

---

## T

**Taxa** — ⚠ Quantas de quantas. ⚠ Para achados de servidor, `20/20` significa **ausência de defesa**.

**`ThisDeviceOnly`** — ⚠ No iOS, decide se o item do `Keychain` **vai para o backup**.

**`TrustManager`** — ⚠ Vazio = **aceita qualquer certificado**. Achado clássico.

---

## V

**`VALE NO APARELHO?`** — ⚠ A coluna do Curso 2 — aqui virou **nível**.

**`WebView`** — ⚠ Fronteira entre dois mundos. ⚠ **Não usa a pilha do app** — o pinning não vale nele.

---

## Termos que NÃO são deste curso

| Termo | Curso correto |
|---|---|
| `DEX`, `smali`, `Intent`, `ContentProvider`, `run-as` | **Android Security Research** (Curso 1) |
| `Mach-O`, `entitlement`, `Keychain`, `Keychain `access-group, lldb` | **iOS Security Research** (Curso 2) |
| `IDOR`, `BOLA`, `BFLA`, sessão web, CSRF, CORS | **Web Apps e APIs** |
| `TLS pinning` como **implementação** | Curso 2 (iOS) / Curso 1 (Android) |
| Exploração de kernel, ROP | Exploit Development |
| `OBJECT_HEADER`, `IOCTL` | Windows Internals / Pesquisa em Windows |

⚠ **A regra da trilha:** conceito compartilhado aparece **breve** onde não pertence, e é **aprofundado** onde pertence. ⚠ `Mach-O` e `DEX` são dos Cursos 1 e 2 — ⚠ aqui **não se repetem**; ⚠ **investiga-se o comportamento**.

---

*Glossário original do curso. As definições assumem o contexto do material.*
