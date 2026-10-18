# Glossário — Segurança de Aplicações Web e APIs

**Termos do curso, definidos uma vez, em ordem alfabética**

---

## A

**Allowlist** — Lista do que é **permitido**. ⚠ Preferida sobre denylist porque falha por **omissão visível**, e a denylist por **campo novo**.

**Atomicidade** — Propriedade de uma operação que não pode ser interrompida no meio. ⚠ A ausência dela é a causa única da classe de concorrência.

**Argument injection** — ⚠ Ataque em que o dado vira **opção** de ferramenta (começando com `-`). Sobrevive ao `shell=False`.

---

## B

**BFLA** — *Broken Function Level Authorization*. ⚠ Autorização por **função**: eu posso chamar esta operação?

**BOLA** — *Broken Object Level Authorization*. ⚠ Autorização por **objeto**: este registro é meu?

**BOPLA** — *Broken Object Property Level Authorization*. ⚠ Autorização por **campo**: eu posso ler/escrever este atributo?

---

## C

**Cache deception** — O cache trata o caminho como estático e a aplicação como dinâmico. ⚠ O bug nasce da **divergência entre camadas**.

**Cache poisoning** — ⚠ Header do **cliente** entrando na chave de cache. Impacto em **todos** os usuários — o módulo 1 na forma mais grave.

**Clickjacking** — A página é embutida em `iframe` transparente. Defesa: `frame-ancestors` ou `X-Frame-Options`.

**`compare_digest`** — Comparação em **tempo constante**. ⚠ Obrigatória para assinatura e segredo, porque a comparação comum vaza byte a byte.

**CORS** — ⚠ Não é defesa da aplicação — é **escotilha** que relaxa a same-origin policy. Refletir origem **com credencial** é vulnerabilidade.

**CSP** — *Content-Security-Policy*. ⚠ **Mitigação, não correção** — e com `unsafe-inline` não é defesa.

**CSRF** — *Cross-Site Request Forgery*. ⚠ **Autoridade emprestada**, não injeção: o navegador envia o cookie sozinho.

---

## D

**Denylist** — Lista do que é proibido. ⚠ Falha por **forma** — e a forma é livre.

**Desserialização insegura** — ⚠ A injeção do módulo 5 em outro canal, mas que executa **código**. O formato que **constrói objeto** nunca aceita dado de usuário.

**DNS rebinding** — ⚠ TOCTOU de DNS: o nome resolve público na validação e privado na busca.

**DOM-based XSS** — XSS em que o **servidor não participa** — o dado vai de `location`/`postMessage` para `innerHTML`. ⚠ Só ler o código acha.

---

## E

**Enumeração** — ⚠ Descobrir o que existe pela **diferença de resposta**. Um `401` confirma mais que um `404`.

**Escalada horizontal** — Usuário A alcança dado de usuário B (mesmo papel). ⚠ IDOR/BOLA.

**Escalada vertical** — Usuário comum alcança função de admin. ⚠ BFLA.

**Exposição excessiva** — A resposta entrega **mais do que a operação precisa**. ⚠ O `SELECT *` é o caso típico.

---

## F

**Fronteira de confiança** — Ponto em que o dado passa de **forjável** para **tratado como verdade**. ⚠ São **seis** numa aplicação web.

**Fixação de sessão** — ⚠ O atacante conhece um ID antes do login, e ele **não é rotacionado**.

---

## G

**GraphQL** — ⚠ O **cliente** monta a consulta; a autorização migra do **endpoint** para o **campo**.

**`GrantedAccess`** — não é deste curso; pertence ao Windows Internals.

---

## I

**IDOR** — *Insecure Direct Object Reference*. Nome antigo de **BOLA**.

**Injeção** — ⚠ Dado e instrução no **mesmo canal**. Parametrizar **separa canais**; escapar ensina o interpretador a adivinhar.

**Introspecção (GraphQL)** — Query que devolve o **esquema inteiro**. ⚠ Desligá-la não é correção — a autorização por campo é.

---

## L

**`localStorage`** — ⚠ Imuniza contra CSRF e entrega tudo ao XSS. Não é escolha gratuita — é compensação.

---

## M

**Mass assignment** — ⚠ A aplicação aceita o objeto inteiro e grava tudo que veio. Correção: **allowlist de campo**.

**Metadata (nuvem)** — Serviço em `169.254.169.254` que entrega **credencial de instância**. ⚠ O destino de maior valor em SSRF.

---

## N

**`noSQL injection`** — ⚠ O dado vira **operador**, não sintaxe. Correção: allowlist de **chave**.

---

## O

**Observação** — ⚠ O que a resposta **fez** — falsificável por repetição. Distinta de hipótese e de evidência.

**`OPTIONS`** — ⚠ Responde **sem autenticar** e revela os métodos permitidos. O teste mais barato que existe.

**ORM injection** — ⚠ O dicionário do cliente entra direto no filtro, e ele filtra por campo que não deveria existir.

---

## P

**`pickle`** — Formato Python que **constrói objeto** ao desserializar. ⚠ Execução de código: nunca aceita dado de usuário.

**PoC controlada** — ⚠ A **requisição mínima** que demonstra o alcance, com dado fictício, **sem executar a consequência**.

**Path traversal** — ⚠ `..` tem infinitas codificações; denylist falha. Correção: **`realpath` + conferência de base**.

---

## R

**Rate limiting** — ⚠ Por **identidade** e por **alvo**, nunca por IP sozinho — `X-Forwarded-For` o burla.

**`realpath`** — Resolve `..`, symlink e caminho relativo. ⚠ A conferência de base acontece **depois** da resolução.

**Rotação (sessão)** — Trocar o identificador ao **elevar privilégio**. ⚠ Sem ela, o MFA é decorativo e a fixação funciona.

---

## S

**`SameSite`** — Flag de cookie. ⚠ `Lax` **mitiga** CSRF, não elimina: permite envio em `GET` de topo.

**`SELECT *`** — ⚠ Exposição esperando acontecer. Selecionar explicitamente, do banco ao JSON.

**`shell=False`** — Execução sem shell intermediário. ⚠ Necessária, e **não suficiente** — falta a allowlist de formato e o `--`.

**SSRF** — *Server-Side Request Forgery*. ⚠ **Confusão de posição**: o atacante usa o privilégio de **rede** do servidor.

---

## T

**TOCTOU** — *Time-of-check to time-of-use*. ⚠ Validar num instante e usar em outro. Em SSRF, é o DNS; em concorrência, é a janela.

**`textContent`** — Escreve texto **sem interpretar**. ⚠ O oposto de `innerHTML`, que interpreta.

---

## U

**UUID** — ⚠ Não corrige IDOR — **encarece**. O identificador vaza por outras vias.

---

## V

**Versionamento (API)** — ⚠ A superfície esquecida: a correção aplicada em `v2` deixa a falha viva em `v1`.

---

## W

**Webhook** — Notificação a URL cadastrada pelo usuário. ⚠ É **SSRF por desenho** — e a assinatura exige `compare_digest`.

**WebSocket** — ⚠ **Não aplica same-origin no handshake** — quem decide é o servidor, conferindo `Origin`.

---

## X

**XSS** — ⚠ Não é "injetar `<script>`" — é o dado ser interpretado **como código no contexto** em que foi colocado.

**XXE** — *XML External Entity*. ⚠ Combina leitura local (módulo 5) e requisição interna (módulo 7). Correção: **desligar entidade externa**.

---

## Termos que NÃO são deste curso

Aparecem em conversa, mas pertencem a outro material da trilha:

| Termo | Curso correto |
|---|---|
| Framing, `TE`/`CL`, desync, H2→H1 | **HTTP Smuggling** |
| Corpus de fronteira, harness diferencial | **Parser Differentials** |
| EOF do parser, N implementações | **Parser Differentials** |
| `ROP` em binário, heap grooming de userspace | Exploit Development |
| `Sigma`, WAF, taxa de falso negativo | Detecção e Evasão |
| `EPROCESS`, `ALPC`, `ETW`, `PPL` | Windows Internals |
| `kmalloc`, `KASAN`, `cap_effective` | Linux Internals |
| Composição de achados, cadeia de exploração | **Cadeia de Exploração Web** (futuro) |

⚠ **A relação com `HTTP Smuggling` e `Parser Differentials` é deliberada:** o módulo 10 toca **fronteira entre parsers** como **uma classe entre outras** e aponta para lá. As dez variantes, o harness e a medição de desync estão nos cursos específicos — **nenhum material repete o outro**.

---

*Glossário original do curso. As definições assumem o contexto do material — quando um termo tem uso diferente em outro contexto, vale a definição daqui.*
