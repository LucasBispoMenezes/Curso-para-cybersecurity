# Módulo 1 — O Que Criptografia Aplicada Resolve (e o Que Não Resolve)

**Carga:** 2 horas (1h teoria · 1h lab)
**Pré-requisitos:** curso de Redes

---

## Objetivos

1. Separar os **quatro problemas** que criptografia resolve — e os que ela **não** resolve.
2. Escolher a **primitiva certa** para cada problema.
3. Entender por que "usar AES" não é resposta, e por que "usar TLS" também não.
4. Reconhecer a fronteira entre **criptografia** e **controle de acesso**.
5. Montar a tabela **problema → primitiva → erro comum**.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o curso:**

> **Criptografia resolve quatro problemas. Não resolve os outros — e a maior parte dos incidentes
> é tratar um problema dos outros com ferramenta de criptografia.**

⚠ **Os quatro problemas:**

| # | Problema | Pergunta | Primitiva |
|---|---|---|---|
| 1 | **Confidencialidade** | Alguém sem a chave consegue ler? | Cifra simétrica / assimétrica |
| 2 | **Integridade** | O dado foi alterado? | MAC, AEAD, assinatura |
| 3 | **Autenticidade** | Veio de quem diz que veio? | MAC, assinatura |
| 4 | **Não repúdio** | Ele pode negar depois? | Assinatura digital |

⚠ **E os problemas que ela NÃO resolve:**

| Problema | Por que criptografia não resolve | O que resolve |
|---|---|---|
| **Autorização** | A chave certa não diz o que você pode fazer | Controle de acesso |
| **Disponibilidade** | Cifra não impede derrubar | Rede, redundância |
| **Injeção** | O dado cifrado, depois decifrado, ainda é dado | Validação de entrada |
| **Engenharia social** | Ninguém precisa quebrar se alguém entrega a chave | Treinamento |
| **Segredo no cliente** | Se está no cliente, o cliente tem | Não enviar |
| **Chave comprometida** | Cifra com chave vazada é ofuscação | Rotação, HSM |

⚠ **A última linha da segunda tabela é a mais importante da carreira de quem usa criptografia.** Se
a chave vazou, **a cifra não protege nada** — e a maior parte dos incidentes graves é isso, não
matemática quebrada.

---

## 1.1 Confidencialidade — e o erro de "usar AES"

⚠ **A pergunta certa não é "que algoritmo", é "confidencialidade contra quem, por quanto tempo".**

```
┌──────────────────────────────────────────────────────────────────┐
│ O QUE VOCÊ ESTÁ PROTEGENDO?                                      │
├──────────────────────────────────────────────────────────────────┤
│ · dado em trânsito         → cifra de canal (TLS)                │
│ · dado em repouso          → cifra de bloco + envelope de chave  │
│ · dado em uso (memória)    → ⚠ difícil; TEE, e mesmo assim...     │
│ · segredo em massa         → derivado, não armazenado             │
│ · sessão                   → chave efêmera, forward secrecy       │
└──────────────────────────────────────────────────────────────────┘
```

⚠ **A quarta linha é a que a maioria erra.** Uma **senha** não se cifra — se **deriva** com KDF
(módulo 5). Cifrar senha é erro, porque a chave está no servidor, **e quem tem o servidor tem a
senha**. **Derivação é one-way: quem tem o servidor tem o hash, e o hash não é a senha.**

⚠ **E a quinta linha define a diferença entre TLS 1.2 e 1.3.** No 1.3, **todo** handshake é
efêmero — então a chave de sessão de hoje **não** decifra a gravação de ontem, **mesmo se a chave
privada do servidor vazar amanhã**. Isso é *forward secrecy*, e é a razão de migrar.

```bash
mkdir -p ~/crypto-lab/mod01 && cd ~/crypto-lab/mod01

echo "═══ 1. o que 'usar AES' quer dizer ═══"
python3 - <<'PY'
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import binascii

chave = get_random_bytes(16)

# ── a forma ERRADA: ECB, sem IV, sem autenticação ──
ecb = AES.new(chave, AES.MODE_ECB)

# ── a forma CERTA: AEAD (GCM) com nonce e tag ──
nonce = get_random_bytes(12)
gcm = AES.new(chave, AES.MODE_GCM, nonce=nonce)

dado = b"transferir 100 para conta A"   # 29 bytes

ct_ecb = ecb.encrypt(dado + b"\x00" * ((16 - len(dado) % 16) % 16))
ct_gcm, tag = gcm.encrypt_and_digest(dado)

print("  entrada  :", dado.decode())
print()
print("  ECB (⚠ sem IV, sem tag):")
print("    ct :", binascii.hexlify(ct_ecb[:32]).decode(), "...")
print("    tag: (nenhuma)")
print()
print("  GCM (✓ com nonce e tag):")
print("    ct :", binascii.hexlify(ct_gcm).decode())
print("    tag:", binascii.hexlify(tag).decode())
print("    nonce:", binascii.hexlify(nonce).decode())
PY
```

⚠ **As duas saídas são "AES".** E as duas são indistinguíveis para quem só olha a chamada. **A
diferença está no que a primeira não tem:** IV, e tag de autenticação.

⚠ **O ECB sem IV tem uma propriedade fatal:** **o mesmo plaintext produz o mesmo cyphertext.** Duas
mensagens idênticas cifradas **são idênticas no disco** — e o atacante aprende sobre o conteúdo
**sem quebrar a cifra**. O módulo 3 demonstra isso com a imagem do pinguim.

**Produza `confidencialidade.md`:**

| Cenário | Primitiva certa | Erro comum |
|---|---|---|
| Senha de usuário | | |
| Banco de dados em repouso | | |
| Canal de rede | | |
| Chave de API | | |
| Token de sessão | | |

**Responda:**

1. Por que **cifrar senha** é erro? O que fazer em vez disso?
2. O que ECB **não** tem que GCM tem?
3. Qual a diferença prática de *forward secrecy* entre TLS 1.2 e 1.3?
4. **Por que "está cifrado" não é resposta** sem dizer contra quem?

---

## 1.2 Integridade e autenticidade — o par que a maioria junta errado

⚠ **Confidencialidade sem integridade é um dos erros mais comuns** — e produz o padding oracle.

```
PROBLEMA 1: só cifra
    atacante MODIFICA o cyphertext
    → o receptor decifra
    → recebe LIXO
    → ⚠ e não sabe que foi alterado

PROBLEMA 2: só MAC
    atacante lê o dado em claro
    → confidencialidade perdida

SOLUÇÃO: as duas JUNTAS, na ordem certa
    ⚠ e a ordem importa (módulo 7)
```

⚠ **A tabela da ordem é o conteúdo do módulo 7, mas você precisa vê-la agora:**

| Construção | Como | Segurança |
|---|---|---|
| **Encrypt-and-MAC** | Cifra, e MAC do plaintext | ⚠ **Vaza e é inseguro** |
| **MAC-then-Encrypt** | MAC do plaintext, depois cifra | ⚠ **Padding oracle** (TLS 1.0/1.1) |
| **Encrypt-then-MAC** | Cifra, MAC do **cyphertext** | ✓ **Correto** |
| **AEAD** | Faço os dois integrados (GCM, ChaCha20-Poly1305) | ✓ **Prefira este** |

⚠ **A linha do MAC-then-Encrypt é a que produziu o padding oracle do TLS 1.0/1.1** — e é a razão
pela qual o TLS 1.3 usa **só AEAD**. **A ordem não era "preferência"; era correção.**

⚠ **E a linha do AEAD é a recomendação moderna.** Você **não** escolhe a ordem — a construção faz
isso por você, **e certo**. **É por isso que o curso recomenda AEAD e desencoraja cifra crua em
código novo.**

**Produza `integridade.md`:**

| Construção | MAC do quê | Ordem | Segura? |
|---|---|---|---|
| Encrypt-and-MAC | | | |
| MAC-then-Encrypt | | | |
| Encrypt-then-MAC | | | |
| AEAD | | | |

**Responda:**

1. Por que **MAC-then-Encrypt** gerou padding oracle?
2. Por que **Encrypt-then-MAC** é correto?
3. O que o **AEAD** resolve que você teria que fazer à mão?
4. **Por que "cifra sozinha" deixa o dado alterável** sem o receptor saber?

---

## 1.3 A tabela problema → primitiva

⚠ **O entregável central do módulo. Decore a estrutura, não os nomes.**

| Você quer | Use | **NÃO use** |
|---|---|---|
| Confidencialidade de dado, com integridade | **AEAD** (AES-GCM, ChaCha20-Poly1305) | AES-CBC sem MAC |
| Só integridade/autenticidade, sem segredo | **HMAC-SHA-256** | SHA-256 cru |
| Provar autoria, com não repúdio | **Ed25519**, ECDSA P-256, RSA-PSS | RSA PKCS#1 v1.5 |
| Guardar senha | **argon2id**, scrypt, bcrypt | SHA-256, MD5, PBKDF2 com poucas iterações |
| Derivar chave de outra chave | **HKDF** | SHA-256 direto |
| Acordo de chave | **ECDH X25519** | Diffie-Hellman sem autenticação |
| Cifra assimétrica de pouco dado | **RSA-OAEP 3072+** ou **ECIES** | RSA PKCS#1 v1.5 |
| Comparar segredo | **`hmac.compare_digest`**, `CRYPTO_memcmp` | `==` |
| Aleatoriedade | **`getrandom`**, `os.urandom`, `/dev/urandom` | `random`, `time()`, `rand()` |
| Token com assinatura | **JWT com `alg` fixado no código** | JWT sem validar `alg` |

⚠ **As três linhas de "NÃO use" mais violadas em código real:**

| Não use | Por quê |
|---|---|
| **SHA-256 para senha** | Rápido demais — GPU testa bilhões por segundo |
| **`==` para comparar segredo** | **Sai no primeiro byte diferente** — vaza por tempo |
| **JWT sem fixar `alg`** | Atacante troca para `none` ou confunde HMAC com RSA |

⚠ **A segunda linha é contraintuitiva e merece o exemplo.** `==` em string compara **byte a byte e
para no primeiro diferente**. Se o atacante mede **quanto tempo** a comparação levou, ele descobre
**quantos bytes estavam certos** — e monta o segredo byte a byte. **É *timing attack*, e a defesa é
uma função que compara sempre o todo.**

```bash
echo "═══ 2. a diferença entre 'está cifrado' e 'está seguro' ═══"
python3 - <<'PY'
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import hmac, hashlib, binascii

chave = get_random_bytes(32)
msg = b"aprovar transferencia de R$ 100,00 para conta 12345"

# ── construção ERRADA: AES-CBC sem MAC ──
iv = get_random_bytes(16)
c = AES.new(chave[:16], AES.MODE_CBC, iv=iv)
# padding PKCS#7
pad = 16 - len(msg) % 16
ct_errado = c.encrypt(msg + bytes([pad]) * pad)

print("  ── Construção ERRADA: CBC sem autenticação ──")
print("     ct:", binascii.hexlify(ct_errado[:16]).decode(), "...")
print("     ⚠ o atacante PODE alterar o ct — e o receptor não sabe")

# simula alteração: flip de um byte
ct_alterado = bytearray(ct_errado)
ct_alterado[0] ^= 0x01

d = AES.new(chave[:16], AES.MODE_CBC, iv=iv)
try:
    pt = d.decrypt(bytes(ct_alterado))
    unpadded = pt[:-pt[-1]] if 1 <= pt[-1] <= 16 else pt
    print("     após alterar 1 bit, o receptor decifra:")
    print("       ", unpadded[:60])
    print("     ⚠ sem erro — o dado foi corrompido silenciosamente")
except Exception as e:
    print("     erro:", e)

print()

# ── construção CERTA: Encrypt-then-MAC ──
k_enc = chave[:16]
k_mac = chave[16:]
iv2 = get_random_bytes(16)
c2 = AES.new(k_enc, AES.MODE_CBC, iv=iv2)
ct = c2.encrypt(msg + bytes([pad]) * pad)
tag = hmac.new(k_mac, iv2 + ct, hashlib.sha256).digest()

print("  ── Construção CERTA: Encrypt-then-MAC ──")
print("     ct:", binascii.hexlify(ct[:16]).decode(), "...")
print("     tag:", binascii.hexlify(tag[:16]).decode(), "...")

# tenta a mesma alteração
ct_bad = bytearray(ct)
ct_bad[0] ^= 0x01
tag_novo = hmac.new(k_mac, iv2 + bytes(ct_bad), hashlib.sha256).digest()

if hmac.compare_digest(tag, tag_novo):
    print("     ⚠ tag confere (não deveria)")
else:
    print("     ✓ TAG NÃO CONFERE — alteração detectada, mensagem recusada")
    print("       o receptor recusa ANTES de decifrar")
PY
```

⚠ **A diferença das duas saídas é o curso inteiro.** Na primeira, **o atacante altera um bit e o
receptor decifra sem reclamar** — produzindo dado corrompido **que ele acredita ser autêntico**. Na
segunda, **a alteração é detectada antes de decifrar**.

⚠ **E note a ordem na segunda:** o MAC cobre `iv + ct` — e é verificado **antes** do `decrypt`.
**Isso é Encrypt-then-MAC**, e a ordem é o que impede o oracle.

**Produza `tabela.md`:**

| Problema | Primitiva | Não use | Por quê |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. Para que serve `hmac.compare_digest` em vez de `==`?
2. Por que o MAC cobre **o IV também**?
3. Por que a verificação vem **antes** do `decrypt`?
4. **Por que SHA-256 não serve para senha**, se SHA-256 é seguro?

---

## 1.4 A fronteira — criptografia não é controle de acesso

⚠ **Confundir as duas é a fonte de falha em sistema distribuído.**

```
┌────────────────────────────────────────────────────────────┐
│ CRIPTOGRAFIA responde:                                     │
│   · o dado foi alterado?                                   │
│   · veio de quem tem a chave?                              │
│   · alguém sem a chave consegue ler?                       │
├────────────────────────────────────────────────────────────┤
│ CONTROLE DE ACESSO responde:                               │
│   · QUAL usuário fez isso?     ← ⚠ não é a mesma pergunta   │
│   · ele PODE fazer isso?                                   │
│   · faz sentido no estado atual?                           │
└────────────────────────────────────────────────────────────┘
```

⚠ **A diferença da segunda linha é a falha mais comum em API.** **Uma chave válida não diz QUEM é.**
Se o serviço só verifica a assinatura e não o **conteúdo** do token, um usuário com token válido
**edita o próprio `user_id`** — e a assinatura continua válida, porque **a chave assinou o token
inteiro, incluindo o campo alterado**. **Isso é *JWT confusion*, e a defesa é validar o campo
também, não só a assinatura.**

⚠ **A regra, escrita:**

> **Criptografia prova integridade e posse de chave. Ela não prova identidade de usuário, nem
> autorização, nem intenção.** Essas são decisões de aplicação, e **precisam ser tomadas na
> aplicação**.

⚠ **E é por isso que o `JWT` é tão mal usado.** Ele dá **integridade** — e o desenvolvedor lê isso
como **autorização**. **São coisas diferentes.**

```bash
echo "═══ 3. o que a assinatura NÃO prova ═══"
python3 - <<'PY'
import hmac, hashlib, json, base64

chave = b"segredo-do-servidor"

def b64u(b): return base64.urlsafe_b64encode(b).rstrip(b"=")
def jwt(payload):
    h = b64u(json.dumps({"alg":"HS256","typ":"JWT"},separators=(',',':')).encode())
    p = b64u(json.dumps(payload,separators=(',',':')).encode())
    s = b64u(hmac.new(chave, h + b"." + p, hashlib.sha256).digest())
    return h + b"." + p + b"." + s

# o servidor emite o token do usuário 1000
tok = jwt({"user_id": 1000, "role": "leitor"})
print("  token emitido:")
print("   ", tok.decode()[:100], "...")
print()

# ⚠ o atacante altera o payload e recalcula a assinatura
#    — NÃO CONSEGUE, não tem a chave
forjado = b"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + \
          b64u(json.dumps({"user_id": 1, "role": "admin"},separators=(',',':')).encode()) + \
          b".assinatura-falsa"

print("  token forjado (sem a chave):")
print("   ", forjado.decode()[:100], "...")
print("     ⚠ a assinatura NÃO confere — o servidor recusa. ✓")
print()

# ✓ o atacante LEGÍTIMO altera o próprio token e RECALCULA
#   (ele é o dono, mas quer outro papel)
tok_proprio = jwt({"user_id": 1000, "role": "admin"})   # ⚠ ele ASSINA de novo, se tiver a chave
print("  ⚠ mas se o CLIENTE tiver a chave, ele forja o próprio papel:")
print("     ", tok_proprio.decode()[:100], "...")
print()
print("  ⚠ por isso: chave de assinatura NUNCA vai para o cliente.")
print("  ⚠ e por isso: o servidor valida 'role' contra o banco,")
print("     não confia no campo do token.")

# e o caso real: EXEMPLO com alg:none
print()
print("  ── e o ataque clássico: alg=none ──")
cab = b64u(b'{"alg":"none","typ":"JWT"}')
pay = b64u(json.dumps({"user_id":1,"role":"admin"},separators=(',',':')).encode())
print("   ", (cab + b"." + pay + b".").decode())
print("     ⚠ se o servidor confia no cabeçalho 'alg' e aceita 'none',")
print("        este token passa SEM assinatura nenhuma.")
print("     ✓ defesa: FIXAR o algoritmo no código, nunca ler do token.")
PY
```

⚠ **A última parte é a falha real, e a defesa é uma linha de código:** **nunca ler `alg` do
token** — usar o que o servidor decidiu. É a **classe 4** (validação ausente) do módulo 7.

**Produza `fronteira.md`:**

| Pergunta | Criptografia responde? | Quem responde |
|---|---|---|
| O dado foi alterado? | | |
| Quem é o usuário? | | |
| Ele pode fazer isso? | | |
| A chave é válida? | | |
| Faz sentido agora? | | |

**Responda:**

1. **Por que "chave válida" não significa "usuário X"?**
2. O que o `alg: none` explora?
3. Por que validar `role` contra o banco e não confiar no token?
4. **Por que confundir as duas colunas é a falha mais comum em API?**

---

## 1.5 LAB — A tabela aplicada e a primeira demonstração

**Duração:** 60 min

### Passo 1 — A tabela, sobre casos reais (25 min)

⚠ **Escolha **cinco** sistemas que você usa e preencha. Não teoria — o que eles realmente fazem.**

| # | Sistema | Problema que a cripto resolve lá | Primitiva provável | O que ela **não** resolve |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

⚠ **Exemplos para orientar (não copie — investigue o seu):**

| Sistema | Confidencialidade | Integridade | Autenticidade | Não repúdio |
|---|---|---|---|---|
| HTTPS | ✓ | ✓ | ✓ | ✗ (é canal, não documento) |
| Senha de app | ✗ (**deriva**) | ✓ | ✓ | ✗ |
| Backup cifrado | ✓ | ✓ (com AEAD) | ✗ | ✗ |
| Assinatura de PDF | ✗ | ✓ | ✓ | ✓ |
| Token de C2 | ✓ | ✓ | ✓ | ✗ |

**Responda:**

1. **Qual dos cinco tem menos propriedade** que você imaginaria?
2. Algum deles usa cripto para resolver autorização? (É o erro.)
3. **Qual deles você olharia primeiro** numa auditoria? Por quê?
4. O `HTTPS` dá **não repúdio**? Por quê não?

### Passo 2 — A primeira quebra (25 min)

⚠ **Quebre a sua própria mensagem.**

```bash
cd ~/crypto-lab/mod01

cat > quebra-ecb.py <<'PY'
#!/usr/bin/env python3
"""
Demonstra por que ECB sem IV vaza informação estrutural.

⚠ Demonstração didática — suas chaves, sua máquina.
"""
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import binascii
from collections import Counter

chave = get_random_bytes(16)

def cifra_ecb(dado, chave):
    """⚠ ECB: mesmo bloco → mesmo cyphertext."""
    c = AES.new(chave, AES.MODE_ECB)
    pad = 16 - len(dado) % 16
    return c.encrypt(dado + bytes([pad]) * pad)

def cifra_cbc(dado, chave):
    """✓ CBC: IV torna blocos iguais diferentes."""
    iv = get_random_bytes(16)
    c = AES.new(chave, AES.MODE_CBC, iv=iv)
    pad = 16 - len(dado) % 16
    return iv + c.encrypt(dado + bytes([pad]) * pad)

# Um dado com estrutura repetida — como dados reais têm
dados = (
    b"USUARIO=ana;PERFIL=admin;ATIVO=1;" * 2 +
    b"USUARIO=bob;PERFIL=user;ATIVO=0;"  * 2 +
    b"USUARIO=ana;PERFIL=admin;ATIVO=1;"
)

print("═══ O DADO ORIGINAL ═══")
print(f"  {len(dados)} bytes")
print()

# ── ECB ──
ct_ecb = cifra_ecb(dados, chave)
blocos_ecb = [ct_ecb[i:i+16] for i in range(0, len(ct_ecb), 16)]

print("═══ ECB (⚠ sem IV) ═══")
print(f"  {len(blocos_ecb)} blocos de 16 bytes")
print()
print("  blocos:")
for i, b in enumerate(blocos_ecb):
    print(f"    [{i:2}] {binascii.hexlify(b).decode()}")

repetidos = [(h, n) for h, n in Counter(blocos_ecb).items() if n > 1]
print()
print(f"  ⚠ blocos REPETIDOS: {len(repetidos)}")
for h, n in repetidos[:4]:
    inds = [i for i, b in enumerate(blocos_ecb) if b == h]
    print(f"     {binascii.hexlify(h).decode()}  aparece {n}x nos índices {inds}")
    print(f"     ⚠ mesmo cyphertext = mesmo plaintext. O atacante APRENDE sem a chave.")

print()

# ── CBC ──
ct_cbc = cifra_cbc(dados, chave)
blocos_cbc = [ct_cbc[16+i:16+i+16] for i in range(0, len(ct_cbc)-16, 16)]

print("═══ CBC (✓ com IV) ═══")
print(f"  {len(blocos_cbc)} blocos + IV de 16 bytes")
print()
_rep_cbc = [(h, n) for h, n in Counter(blocos_cbc).items() if n > 1]
print(f"  blocos repetidos: {len(_rep_cbc)}")
print("  ✓ nenhum — o IV encadeia, e blocos iguais viram diferentes")

print()
print("═══ A CONCLUSÃO ═══")
print("  ECB não tem IV: o mesmo bloco de plaintext vira o mesmo de cyphertext.")
print("  O atacante NÃO precisa da chave: ele vê o PADRÃO.")
print("  ⚠ é o ataque à imagem do pinguim, e é o motivo de ECB ser proibido.")
PY

python3 quebra-ecb.py
```

⚠ **A saída é o argumento.** Os blocos repetidos **são** os trechos repetidos do dado — e **o
atacante sabe quais são, sem a chave**. Ele não lê o conteúdo; ele lê a **estrutura**.

⚠ **E é suficiente para atacar de verdade.** Em ECB sobre dado de sessão, saber que "o bloco 8 é
igual ao bloco 3" permite **reordenar** blocos e produzir mensagem válida — sem nunca decifrar.

Produza `quebra-ecb.md`:

| Métrica | ECB | CBC |
|---|---|---|
| Blocos repetidos | | |
| Payload visível ao atacante | | |
| Precisa da chave para atacar? | | |

**Responda:**

1. **Quantos blocos repetidos no ECB?** O atacante precisa da chave?
2. Por que CBC não tem repetição?
3. **O que o atacante aprende** sem decifrar?
4. O que uma **tag de autenticação** acrescentaria aqui?

### Passo 3 — A tabela de decisão (10 min)

Produza `decisao.md` — **o instrumento que você vai usar em código**:

```markdown
# Árvore de decisão criptográfica

## Vou guardar uma SENHA?
→ NÃO cifre. NÃO use SHA-256.
→ Use argon2id (ou bcrypt). Parâmetro: memória ≥ 64MB, iterações ≥ 3.

## Vou guardar DADO e preciso ler depois?
→ AEAD: AES-GCM (se AES-NI) ou ChaCha20-Poly1305.
→ ⚠ nonce ÚNICO por chave. Nunca repita.

## Vou transmitir por canal?
→ TLS 1.3. Não escreva cifra de canal você mesmo.

## Vou provar que EU escrevi?
→ Assinatura: Ed25519 (preferida) ou ECDSA P-256.

## Vou provar que o dado não mudou, e temos segredo comum?
→ HMAC-SHA-256.

## Vou derivar uma chave de outra?
→ HKDF. Nunca SHA-256 direto.

## Vou comparar dois segredos?
→ hmac.compare_digest / CRYPTO_memcmp. NUNCA ==

## Vou gerar algo aleatório?
→ os.urandom / getrandom. NUNCA random, rand(), time().

## Vou cifrar dado maior que a chave (assimétrico)?
→ Híbrido: cifra o dado com simétrica, e a CHAVE com RSA-OAEP/ECIES.
```

**Responda:**

1. **Qual linha você já viu errar** em código que conhece?
2. Qual linha é a **mais violada** em experiência sua?
3. **Se o AEAD é sempre preferível, quando ainda se usa CBC?** (Dica: interoperação.)
4. Qual linha você acrescentaria?

### Critérios de aceitação

- `confidencialidade.md` com os cinco cenários preenchidos.
- Você explicou por que **cifrar senha** é erro.
- `integridade.md` com as **quatro** construções e a ordem de cada.
- Você explicou por que **MAC-then-Encrypt** gerou padding oracle.
- `tabela.md` com problema → primitiva → erro comum.
- Você demonstrou **Encrypt-then-MAC detectando a alteração** que CBC sem MAC não detectou.
- `fronteira.md` com as **cinco** perguntas separadas.
- Você explicou por que **chave válida ≠ usuário identificado**.
- `quebra-ecb.py` rodando, com a **contagem de blocos repetidos**.
- Você explicou o que o atacante aprende **sem decifrar**.
- `decisao.md` com as **nove** linhas.
- Você respondeu **quando ainda se usa CBC**.

---

## Avaliação

1. Cite os quatro problemas que criptografia resolve.
2. **Cite quatro problemas que ela NÃO resolve**, com o que resolve cada um.
3. Por que confidencialidade **sem** integridade é erro?
4. Descreva as quatro construções de MAC+cifra e a segurança de cada.
5. **Por que MAC-then-Encrypt produz padding oracle?**
6. Por que o AEAD é a recomendação moderna?
7. Cite a primitiva certa para: senha, dado em repouso, autoria, integridade com segredo.
8. **Por que SHA-256 não serve para senha**, se SHA-256 é seguro?
9. **Por que `==` para comparar segredo é falha?** Qual a defesa?
10. Por que ECB sem IV vaza, mesmo com AES correto?
11. **Por que "chave válida" não prova "usuário identificado"?**
12. O que o `alg: none` explora, e qual a defesa?
13. Por que cifrar uma senha é erro? O que fazer?
14. O que é *forward secrecy* e por que TLS 1.3 a dá sempre?
15. **Por que a criptografia não resolve autorização?**

---

**Próximo:** [Módulo 2 — Aleatoriedade](modulo-02.md)
