# Módulo 4 — Chave: Derivação, Troca, Envelope, Rotação

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 3

---

## Objetivos

1. Entender que **a chave é o segredo**, e o algoritmo é público — logo, a segurança **mora na chave**.
2. Distinguir **KDF de senha** de **KDF de chave**, e saber quando cada uma se aplica.
3. Entender derivação, acordo (ECDH) e envelope — e por que envelope é o padrão real.
4. Reconhecer os **cinco erros de gerenciamento de chave**.
5. Montar o **ciclo de vida** de uma chave: geração, uso, rotação, destruição.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O algoritmo é público. A chave é o único segredo. Logo, toda a segurança está no gerenciamento
> da chave — e é ali que a maioria dos incidentes acontece.**

⚠ **A evidência:**

| Incidente | Algoritmo | O que quebrou |
|---|---|---|
| **Heartbleed (2014)** | TLS + AES | **Chave privada lida da memória** |
| **Debian OpenSSL (2006)** | RSA + AES | **Chave previsível** (módulo 2) |
| **PS3 (2010)** | ECDSA P-256 | **Chave derivada** do nonce reusado |
| **Junos / CVE-2015-7755** | IPSec | **Chave de VPN previsível** |
| **Chave em repositório público** | AES-256 | **Chave commitada** |
| **Chave única para tudo** | AES-256 | **Um vazamento derruba tudo** |
| **Chave nunca rotacionada** | AES-256 | **Vaza em 2019, vale em 2026** |
| **Chave no cliente** | AES-256 | **O cliente tem a chave** |

⚠ **As quatro últimas linhas são as mais frequentes e as menos glamourosas.** Não há CVE, não há
matemática — há **uma chave no lugar errado**, ou **uma chave que nunca mudou**.

⚠ **E a razão de o módulo existir:** você vai usar AES-256 corretamente e **ainda assim** ter um
sistema inseguro, porque a chave está no `.env` do repositório, ou é a mesma desde o lançamento.

---

## 4.1 Os quatro tipos de chave, e por que não se confundem

⚠ **Erro clássico: usar a mesma chave para tudo.**

| Tipo | Vem de | Propósito | ⚠ Nunca fazer |
|---|---|---|---|
| **Chave de cifra** | CSPRNG, KDF, acordo | Confidencialidade | Reusar como MAC |
| **Chave de MAC** | CSPRNG, KDF | Integridade/autenticidade | Reusar como cifra |
| **Chave de assinatura** | CSPRNG | Não repúdio | Compartilhar com o verificador |
| **Segredo derivado de senha** | **KDF lento** (argon2) | Autenticação | Usar como chave de cifra |

⚠ **A razão de não reusar a mesma chave para cifra e MAC é técnica, e vale entender:**

```
Se a MESMA chave K cifra e autentica:

  C = AES_K(P)
  T = HMAC_K(C)

  ⚠ o atacante agora tem dois "usos" de K
  ⚠ e ataques que exploram a RELAÇÃO entre eles existem
  ⚠ (o caso mais conhecido: AES-GCM, onde a chave de hash
     é derivada da chave de cifra de forma específica)

SOLUÇÃO: derivação de subchaves

  K_master
     │
     ├── HKDF(K_master, "encryption") → K_enc
     │
     └── HKDF(K_master, "authentication") → K_mac

  ⚠ cada uso tem a SUA chave, derivada com um rótulo diferente
```

⚠ **A linha do HKDF é o padrão, e o rótulo é o detalhe.** `HKDF(K, "encryption")` e
`HKDF(K, "authentication")` produzem chaves **diferentes e independentes** — mesmo vindo do mesmo
segredo. **É assim que se usa um segredo para múltiplos propósitos, sem reusar.**

⚠ **E a quarta linha da primeira tabela é a distinção que o próximo item aprofunda:** uma senha
**não vira chave** por hash rápido. Ela vira **segredo autenticador** por KDF lento.

```bash
mkdir -p ~/crypto-lab/mod04 && cd ~/crypto-lab/mod04

echo "═══ 1. derivação de subchaves com HKDF ═══"
python3 - <<'PY'
import hashlib, hmac, secrets

def hkdf(ikm, salt, info, length=32):
    """HKDF (RFC 5869) — extract + expand."""
    # extract
    prk = hmac.new(salt, ikm, hashlib.sha256).digest()
    # expand
    out, t, i = b"", b"", 1
    while len(out) < length:
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        out += t
        i += 1
    return out[:length]

master = secrets.token_bytes(32)
salt   = secrets.token_bytes(16)

print(f"  K_master : {master.hex()[:32]}...")
print(f"  salt     : {salt.hex()}")
print()

usos = {
    "encryption":      b"app/v1/encryption",
    "authentication":  b"app/v1/authentication",
    "key-wrapping":    b"app/v1/key-wrapping",
    "storage-index":   b"app/v1/storage-index",
}

derivadas = {}
for nome, info in usos.items():
    k = hkdf(master, salt, info)
    derivadas[nome] = k
    print(f"  {nome:<16} : {k.hex()[:32]}...")

print()
print("  ⚠ todas distintas? ", len(set(derivadas.values())) == len(derivadas))
print("  ✓ mesmo segredo, chaves INDEPENDENTES por rótulo")
print()
print("  ⚠ e o rótulo (info) é a garantia:")
k_errado = hkdf(master, salt, b"app/v1/encryption-typo")
print(f"     rótulo com typo → {k_errado.hex()[:32]}...")
print(f"     igual à correta? {k_errado == derivadas['encryption']}")
print("  ✓ um byte de diferença no rótulo → chave completamente diferente")
PY
```

⚠ **A saída mostra o mecanismo: um segredo, quatro chaves independentes.** E o último bloco é o
argumento de segurança — **o rótulo faz parte da derivação**, então um erro de digitação produz uma
chave **completamente diferente** (que não decifra nada).

⚠ **A consequência prática é boa:** você **não precisa** de quatro segredos guardados. Precisa de
**um**, e do **rótulo certo** em cada uso.

**Produza `tipos-chave.md`:**

| Tipo de chave | Vem de | Propósito | Pode reusar? |
|---|---|---|---|
| Cifra | | | |
| MAC | | | |
| Assinatura | | | |
| De senha | | | |

**Responda:**

1. **Por que não reusar a mesma chave para cifra e MAC?**
2. O que o `HKDF` faz, e o que é o **rótulo** (`info`)?
3. Um erro no rótulo **quebra** a decifração? O que isso garante?
4. Quantos segredos você precisa guardar para quatro usos?

---

## 4.2 KDF de senha versus KDF de chave

⚠ **As duas se chamam KDF e resolvem problemas opostos.**

| | **KDF de senha** | **KDF de chave** |
|---|---|---|
| Entrada | Senha humana (pouca entropia) | Chave/segredo (muita entropia) |
| Objetivo | **Tornar lento** — dificultar força bruta | **Estender e separar** — rápido |
| Algoritmos | **argon2id**, scrypt, bcrypt, PBKDF2 | **HKDF**, SHA-256 de segredo |
| Custo | **Alto de propósito** (memória/tempo) | Baixo |
| Salt | **Obrigatório**, 16 bytes | Opcional |
| Repetível? | Sim, determinístico | Sim |
| Exemplo | Guardar senha de usuário | Derivar chave de sessão |

⚠ **A linha do custo é a razão de existirem duas.** Uma senha tem **talvez 40 bits** de entropia.
Um atacante com GPU testa **bilhões por segundo**. **Se o KDF é rápido, a senha cai.** Se o KDF
**exige 64 MB de RAM e 3 iterações por tentativa**, o atacante não consegue paralelizar — **e o
ataque fica caro**.

⚠ **E a confusão inversa também é erro:** usar **argon2 em derivação de chave** é **desperdício**.
Se o segredo já tem **256 bits de entropia**, torná-lo lento não ajuda em nada — e adiciona latência
em cada mensagem cifrada.

⚠ **A tabela de parâmetros, com o valor de 2026:**

| Algoritmo | Parâmetro | Valor mínimo | Observação |
|---|---|---|---|
| **argon2id** | memória | **64 MB** | O que mais encarece o ataque |
| | iterações | **3** | |
| | paralelismo | 1–4 | |
| **scrypt** | N | **2^15 = 32768** | |
| | r, p | 8, 1 | |
| **bcrypt** | cost | **12** | Legado, mas aceitável |
| **PBKDF2** | iterações | **600.000** (SHA-256) | ⚠ Só se não puder usar argon2 |

⚠ **A escolha do argon2id em vez de argon2i ou argon2d** é deliberada: **`id` é híbrido**,
resistente a ataque de GPU **e** a ataque de canal lateral. **É o que a OWASP recomenda.**

⚠ **E o PBKDF2 é o último recurso.** Ele existe em toda biblioteca (compatibilidade), mas é
**paralelizável em GPU** — e por isso exige **600.000 iterações** para atingir o que o argon2 faz
com 64 MB. **Use se não houver alternativa.**

```bash
echo "═══ 2. o custo do KDF, medido ═══"
python3 - <<'PY'
import time, hashlib, hmac

def mede(nome, f, n=3):
    t0 = time.perf_counter()
    for _ in range(n):
        f()
    dt = (time.perf_counter() - t0) / n
    print(f"  {nome:<40} {dt*1000:9.2f} ms")
    return dt

print("  ── KDF RÁPIDO (errado para senha) ──")
t_sha = mede("SHA-256 (1 iteração)", lambda: hashlib.sha256(b"senha" + b"salt").digest())
t_pbk1 = mede("PBKDF2-HMAC-SHA256 (1.000 iterações)",
              lambda: hashlib.pbkdf2_hmac("sha256", b"senha", b"salt", 1000))

print()
print("  ── KDF LENTO (correto para senha) ──")
t_pbk6 = mede("PBKDF2-HMAC-SHA256 (600.000 iterações)",
              lambda: hashlib.pbkdf2_hmac("sha256", b"senha", b"salt", 600_000), n=1)

try:
    import argon2
    from argon2.low_level import hash_secret_raw, Type
    t_argon = mede("argon2id (64MB, 3 iterações)",
                   lambda: hash_secret_raw(b"senha", b"saltsaltsaltsalt", 3, 65536, 1, 32, Type.ID), n=1)
    print()
    print("  ── a diferença que importa ──")
    print(f"    SHA-256            : {t_sha*1e6:>10.2f} µs por tentativa")
    print(f"    argon2id           : {t_argon*1e6:>10.2f} µs por tentativa")
    print(f"    razão              : {t_argon/t_sha:>10.0f}× mais lento")
    print()
    taxa_gpu = 10**10      # SHA-256 por segundo numa GPU
    print(f"    com 1 GPU a {taxa_gpu:,} SHA-256/s:")
    print(f"      SHA-256 cru      : {2**40/taxa_gpu:>10.2f} s para 2^40 senhas")
    print(f"      argon2id (1 GPU) : {2**40/(1/(t_argon))*1:>10.0f} tentativas/s")
    print(f"                         = {2**40 * t_argon:>10.0f} s")
    print(f"                         = {2**40 * t_argon / 86400 / 365:>10.2f} anos")
    print()
    print("  ⚠ e a MEMÓRIA é o que impede a GPU: argon2 exige 64MB por")
    print("     tentativa PARALELA. Uma GPU com 24GB roda ~375 por vez,")
    print("     não 10.000. É por isso que o argon2 vence.")
except ImportError:
    print("  (argon2 não instalado — pip3 install argon2-cffi)")
    print()
    print("  ⚠ e a diferença é essa: o KDF para senha precisa ser LENTO")
PY
```

⚠ **A saída quantifica o que a intuição não faz.** O `SHA-256` é **microssegundos**; o `argon2id` é
**milissegundos com 64 MB** — e a **memória** é o que impede a GPU de paralelizar.

⚠ **E a última parte é a lição:** um atacante com GPU testa **10^10 SHA-256/s**. Com argon2 a 64 MB,
ele testa **375 por vez**. **A diferença é entre "quebrado em minutos" e "inviável".**

**Produza `kdf.md`:**

| Algoritmo | Tempo por tentativa | Uso correto |
|---|---|---|
| SHA-256 | | |
| PBKDF2 1.000 | | |
| PBKDF2 600.000 | | |
| argon2id | | |

**Responda:**

1. **Por que o KDF de senha tem que ser lento?** O que ele dificulta?
2. Por que **argon2 vence a GPU** onde o PBKDF2 não vence?
3. Por que usar **argon2 em derivação de chave** é desperdício?
4. Qual parâmetro do argon2 é o **mais importante**? Por quê?

---

## 4.3 Acordo de chave — ECDH

⚠ **O problema:** duas partes precisam de uma chave comum, **sem nunca tê-la transmitido**.

```
Alice                                          Bob
  │                                             │
  │ privada a          ──►  pública A = a·G  ◄──│  privada b
  │ pública A                                   │  pública B = b·G
  │                                             │
  │  ◄──────────── troca as PÚBLICAS ─────────► │
  │                                             │
  │ K = a · B                                   │
  │   = a · (b·G)                               │
  │   = (a·b)·G                                 │
  │   = (b·a)·G                                 │
  │   = b · A = K                               │
  │                                             │
  ⚠ as duas chegam à MESMA chave, sem transmiti-la
  ⚠ e um observador só vê A e B — não consegue a·b·G
     (é o problema do logaritmo discreto em curva elíptica)
```

⚠ **A falha do ECDH puro:** ele **não autentica**. Um atacante no meio troca as públicas, e:

```
Alice  ──► A ──► [MITM: privada m, envia M_a]  ──► M_a ──►  Bob
Alice  ◄── M_b ◄──                              ◄── M_b ◄──  Bob

  Alice calcula K1 = a · M_a  (= a · m · G)
  MITM  calcula K1 = m · A    e   K2 = m · B
  Bob   calcula K2 = b · M_b  (= b · m · G)

  ⚠ o MITM decifra TUDO e reenvia
```

⚠ **A solução é autenticar as públicas** — e é exatamente isso que o TLS faz:

| Mecanismo | Como autentica |
|---|---|
| **Certificado do servidor** | A pública está assinada por uma CA |
| **TLS 1.3 com ECDHE** | A pública efêmera é **assinada** pela chave do certificado |
| **Curva X25519** | A recomendação moderna — sem problemas de parâmetro |
| **PSK (pre-shared key)** | Chave compartilhada antes do handshake |

⚠ **A linha do TLS 1.3 é a resposta completa:** ele combina **ECDHE** (para *forward secrecy*) com
**assinatura** (para autenticar). **O resultado é um canal que nem o MITM quebra nem a chave
privada vazada amanhã decifra.**

⚠ **E a recomendação de curva:** **X25519** em vez de P-256. A X25519 é **mais rápida**, **imune a
ataque de canal lateral** de parâmetro inválido, e **não tem os problemas da curva NIST**.

```bash
echo "═══ 3. ECDH — o acordo, e o MITM ═══"
python3 - <<'PY'
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

def par():
    p = x25519.X25519PrivateKey.generate()
    return p, p.public_key()

def pub_bytes(k):
    return k.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)

def deriva(priv, pub_do_outro, contexto=b"app/v1"):
    ss = priv.exchange(pub_do_outro)
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=None, info=contexto).derive(ss)

print("═══ ECDH HONESTO ═══")
a_priv, a_pub = par()
b_priv, b_pub = par()
K_alice = deriva(a_priv, b_pub)
K_bob   = deriva(b_priv, a_pub)
print(f"  pública Alice : {pub_bytes(a_pub).hex()[:32]}...")
print(f"  pública Bob   : {pub_bytes(b_pub).hex()[:32]}...")
print(f"  K Alice       : {K_alice.hex()[:32]}...")
print(f"  K Bob         : {K_bob.hex()[:32]}...")
print(f"  ⚠ iguais? {K_alice == K_bob}")
print("  ✓ chegaram à mesma chave sem transmiti-la")
print()

print("═══ ECDH COM MITM (sem autenticação) ═══")
m_priv, m_pub = par()
a_priv2, a_pub2 = par()
b_priv2, b_pub2 = par()

# o MITM entrega SUA pública para ambos
K_a = deriva(a_priv2, m_pub)         # Alice acha que fala com Bob
K_m1 = deriva(m_priv, a_pub2)        # MITM com Alice
K_b = deriva(b_priv2, m_pub)         # Bob acha que fala com Alice
K_m2 = deriva(m_priv, b_pub2)        # MITM com Bob

print(f"  Alice ↔ MITM : {K_a.hex()[:24]}... == {K_m1.hex()[:24]}... ? {K_a == K_m1}")
print(f"  MITM  ↔ Bob  : {K_b.hex()[:24]}... == {K_m2.hex()[:24]}... ? {K_b == K_m2}")
print(f"  ⚠ Alice e Bob têm chaves DIFERENTES? {K_a != K_b}")
print("  ⚠ o MITM decifra e reenvia — nem Alice nem Bob percebem")
print()
print("═══ A CORREÇÃO ═══")
print("  · autenticar as públicas: assinar com chave de certificado")
print("  · TLS 1.3 faz exatamente isso: ECDHE + assinatura")
print("  · = forward secrecy (ECDHE) + autenticidade (assinatura)")
print()
print("  ⚠ ECDH puro não resolve nada sozinho. É componente, não solução.")
PY
```

⚠ **A saída mostra as duas chaves iguais no caso honesto e diferentes no MITM** — e o MITM
**decifra**. **É a razão de o ECDH nunca andar sozinho.**

⚠ **E é a razão de o módulo 6 (TLS) existir.** Todo o mecanismo de certificado e assinatura está
ali para resolver **exatamente este problema**.

**Produza `ecdh.md`:**

| Cenário | Chave de Alice | Chave de Bob | Iguais? | MITM decifra? |
|---|---|---|---|---|
| Honesto | | | | |
| Com MITM | | | | |

**Responda:**

1. **Como as duas partes chegam à mesma chave** sem transmiti-la?
2. **O que o ECDH sozinho não resolve?**
3. Como o TLS 1.3 resolve?
4. Por que **X25519** em vez de P-256?

---

## 4.4 Envelope — o padrão real

⚠ **O problema:** cifra assimétrica é **lenta** e **limitada em tamanho**. Cifra simétrica é
**rápida** e **ilimitada**. **A solução é usar as duas.**

```
┌──────────────────────────────────────────────────────────────┐
│  ENVELOPE DE CHAVE (key wrapping)                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. gera chave de DADOS aleatória (DEK) — 32 bytes           │
│     DEK = getrandom(32)                                      │
│                                                              │
│  2. cifra o DADO com a DEK, usando AEAD                      │
│     ct = AESGCM(DEK, nonce, dado, aad)                       │
│                                                              │
│  3. cifra a DEK com a chave PÚBLICA do destinatário           │
│     DEK_cifrada = RSA-OAEP(pub, DEK)                          │
│                  ou ECIES(pub, DEK)                           │
│                                                              │
│  4. guarda: DEK_cifrada | nonce | tag | ct                   │
│                                                              │
│  ⚠ o destinatário: decifra a DEK com a privada,               │
│     e depois decifra o dado com a DEK                         │
└──────────────────────────────────────────────────────────────┘
```

⚠ **A razão de o padrão ser esse:**

| Sem envelope | Com envelope |
|---|---|
| RSA cifra ~190 bytes com 2048 bits | Cifra **qualquer tamanho** |
| RSA cifra **lentamente** | Dado cifra **rapidamente** |
| Trocar a chave exige **recifrar tudo** | **Recifra só a DEK** |
| Um destinatário | **Vários destinatários** (uma DEK, N envelopes) |

⚠ **A terceira linha é a que resolve a rotação — e é o que o módulo inteiro aponta.** Com envelope,
**trocar a chave é recifrar 32 bytes por arquivo**, não o arquivo. **É o que torna a rotação de
chave viável em escala.**

⚠ **E a quarta linha resolve o compartilhamento:** um arquivo para cinco pessoas → **uma DEK, cinco
`DEK_cifrada`**. **O dado não é recifrado cinco vezes.**

```bash
echo "═══ 4. envelope, e por que ele torna rotação viável ═══"
python3 - <<'PY'
import os, time, secrets
from Crypto.Cipher import AES, PKCS1_OAEP
from Crypto.PublicKey import RSA

# ── o cenário: 1.000 arquivos de 1 MB ──
N_ARQ = 1000
TAM = 1024 * 1024
DADO = os.urandom(TAM)              # só um pedaço, para medir

print("═══ SEM ENVELOPE: cifrar 1MB direto com RSA ═══")
k = RSA.generate(2048)
print(f"  chave RSA-2048 gerada")
try:
    c = PKCS1_OAEP.new(k.publickey())
    c.encrypt(DADO)
    print("  ⚠ conseguiu (não deveria)")
except Exception as e:
    print(f"  ⚠ FALHOU: {type(e).__name__}: {str(e)[:60]}")
    print("  ⚠ RSA cifra no máximo ~190 bytes com chave de 2048 bits")
print()

print("═══ COM ENVELOPE ═══")
print()
# passo 1: DEK
t0 = time.perf_counter()
deks = [secrets.token_bytes(32) for _ in range(N_ARQ)]
t_dek = time.perf_counter() - t0

# passo 2: cifra o dado com a DEK (simulado, um só por tempo)
t0 = time.perf_counter()
nonce = secrets.token_bytes(12)
ct = AES.new(deks[0], AES.MODE_GCM, nonce=nonce).encrypt(DADO[:TAM])
t_aes = time.perf_counter() - t0

# passo 3: cifra as DEKs com RSA
c = PKCS1_OAEP.new(k.publickey())
t0 = time.perf_counter()
deks_cifradas = [c.encrypt(d) for d in deks]
t_rsa = time.perf_counter() - t0

print(f"  DEK geradas ({N_ARQ})        : {t_dek*1000:8.2f} ms")
print(f"  AES-GCM de 1 MB              : {t_aes*1000:8.2f} ms")
print(f"  RSA-OAEP de {N_ARQ} DEKs       : {t_rsa*1000:8.2f} ms")
print(f"  ⚠ {len(deks_cifradas[0])} bytes por DEK cifrada")
print()

print("═══ ROTAÇÃO DE CHAVE — a comparação que importa ═══")
print()
# sem envelope: recifrar tudo
t0 = time.perf_counter()
for i in range(100):        # amostra de 100
    AES.new(secrets.token_bytes(32), AES.MODE_GCM, nonce=secrets.token_bytes(12)).encrypt(DADO[:TAM])
t_amostra = (time.perf_counter() - t0) / 100
t_sem = t_amostra * N_ARQ
print(f"  SEM envelope: recifrar {N_ARQ} MB")
print(f"    ⚠ {t_sem:8.1f} s   (e o dado é lido e reescrito)")
print()
# com envelope: recifrar só as DEKs
t0 = time.perf_counter()
novo_c = PKCS1_OAEP.new(RSA.generate(2048).publickey())
for d in deks[:100]:
    novo_c.encrypt(d)
t_rsa2 = (time.perf_counter() - t0) / 100 * N_ARQ
print(f"  COM envelope: recifrar {N_ARQ} DEKs (32 bytes cada)")
print(f"    ✓ {t_rsa2:8.3f} s   (o dado NÃO é tocado)")
print()
print(f"  ⚠ razão: {t_sem/t_rsa2:.0f}× mais rápido")
print(f"  ⚠ e o dado pode estar em armazenamento frio, nunca lido")
print()
print("═══ E O COMPARTILHAMENTO ═══")
print()
destinatarios = ["alice", "bob", "carol", "dave", "erin"]
print(f"  arquivo para {len(destinatarios)} pessoas:")
print(f"    · 1 DEK")
print(f"    · 1 cifra do dado")
print(f"    · {len(destinatarios)} DEK_cifrada (uma por pessoa)")
print(f"    ✓ sem envelope: o dado seria cifrado {len(destinatarios)}×")
PY
```

⚠ **A saída quantifica as duas vantagens.** A rotação passa de **segundos de recifragem de dado**
para **milissegundos de recifragem de 32 bytes**. **Isso é o que torna rotação viável.**

⚠ **E a razão final é a que a maioria esquece:** o dado pode estar em **armazenamento frio**
(S3 Glacier, fita) — **rotacionar chave sem ler o dado** é a diferença entre viável e impossível.

**Produza `envelope.md`:**

| Métrica | Sem envelope | Com envelope |
|---|---|---|
| Tamanho máximo | | |
| Rotação de 1 GB | | |
| Compartilhar com 5 | | |
| Dado em armazenamento frio | | |

**Responda:**

1. **Por que RSA não cifra 1 MB?**
2. **Por que envelope torna rotação viável?**
3. Como compartilhar um arquivo com cinco pessoas **com** envelope?
4. Por que o dado em **armazenamento frio** importa para rotação?

---

## 4.5 Os cinco erros de gerenciamento de chave

⚠ **O reconhecimento que o módulo entrega.**

| # | Erro | Como aparece | Consequência |
|---|---|---|---|
| 1 | **Chave embutida no código** | `KEY = "..."` no fonte | Vaza no repositório, no binário |
| 2 | **Chave no cliente** | JS, app mobile, desktop | O cliente **tem** a chave |
| 3 | **Chave única para tudo** | Mesma chave em todos os ambientes/tenants | Um vazamento derruba tudo |
| 4 | **Chave nunca rotacionada** | Mesma desde o lançamento | Vaza em 2019, vale em 2026 |
| 5 | **Chave sem controle de acesso** | `.env` com `644`, arquivo no home | Qualquer processo lê |

⚠ **A #2 é a mais grave e a mais comum em app.** **Se a chave está no cliente, o cliente tem a
chave.** Não importa ofuscação, não importa minificação — **ela está lá**, e quem tem o cliente
**extrai**. **É por isso que "cifrar dado local" com chave embutida é ofuscação, não segurança.**

⚠ **E a #5 merece o comando:**

```bash
echo "═══ 5. os cinco erros — a busca ═══"
echo
cd ~/crypto-lab

echo "── 1. chave embutida no código ──"
grep -rEn '(KEY|SECRET|PASSWORD|TOKEN|API_?KEY)\s*=\s*["\x27][^"\x27]{8,}' \
     . --include='*.py' --include='*.js' --include='*.c' --include='*.go' \
     --include='*.php' --include='*.java' 2>/dev/null | head -10 | sed 's/^/  ⚠ /'
echo

echo "── 2. chave no cliente (arquivo servido) ──"
find . -type f \( -name '*.js' -o -name '*.html' \) -exec grep -lE '(secret|apiKey|privateKey)' {} \; 2>/dev/null | head -5 | sed 's/^/  ⚠ /'
echo

echo "── 3. chave única (hardcoded, pouca variação) ──"
grep -rEoh '(AES|SECRET)[_A-Z]*KEY\s*=\s*["\x27][^"\x27]+' . 2>/dev/null | \
    sed 's/.*=\s*//' | sort -u | head -10 | sed 's/^/  ·  /'
echo

echo "── 4. rotação: há campo de versão da chave? ──"
grep -rEn '(key_?version|kid|key_?id)' . --include='*.py' --include='*.js' 2>/dev/null | \
    head -5 | sed 's/^/  ✓ /'
[ -z "$(grep -rE '(key_?version|kid|key_?id)' . --include='*.py' --include='*.js' 2>/dev/null)" ] && \
    echo "  ⚠ nenhum campo de versão — rotação vai exigir recifrar tudo"
echo

echo "── 5. permissão do arquivo de segredo ──"
for f in $(find . -name '.env' -o -name '*.pem' -o -name '*.key' -o -name 'secrets.*' 2>/dev/null | head -10); do
    printf '  %-40s %s\n' "$f" "$(stat -c %a "$f")"
done
echo

echo "── e os padrões CORRETOS ──"
for pat in 'os.environ' 'getenv' 'vault' 'secret_manager' 'KMS' 'keyring' 'SecretsManager'; do
    n=$(grep -rF "$pat" . --include='*.py' --include='*.js' --include='*.go' 2>/dev/null | wc -l)
    [ "$n" -gt 0 ] && printf '  ✓ %-18s %s\n' "$pat" "$n"
done
```

⚠ **A busca da #4 é a mais reveladora.** Se **não há campo de versão de chave** no formato, então
**rotacionar vai exigir recifrar tudo** — e na prática, **não vai rotacionar**.

⚠ **A regra de projeto que o curso recomenda:**

> **Toda cifra precisa de um campo de versão da chave.** Sem ele, rotação é inviável — e rotação
> inviável significa chave permanente.

**Produza `erros-chave.md`:**

| # | Erro | Encontrado? | Consequência |
|---|---|---|---|
| 1 | Chave no código | | |
| 2 | Chave no cliente | | |
| 3 | Chave única | | |
| 4 | Sem rotação | | |
| 5 | Sem controle de acesso | | |

**Responda:**

1. **Por que "chave no cliente" é ofuscação**, não segurança?
2. Por que a **falta de campo de versão** impede rotação?
3. O que um **KMS** ou *secret manager* resolve que o `.env` não resolve?
4. **Qual dos cinco erros é o mais comum** em experiência sua?

---

## 4.6 Ciclo de vida da chave

⚠ **O entregável do módulo: um ciclo, com estado, versão e destruição.**

```
┌──────────────────────────────────────────────────────────────┐
│  1. GERAÇÃO                                                  │
│     · CSPRNG (módulo 2)                                      │
│     · entropia suficiente                                    │
│     · ⚠ em VM clonada: verificar RNG do host                  │
├──────────────────────────────────────────────────────────────┤
│  2. DISTRIBUIÇÃO                                             │
│     · nunca por canal não autenticado                        │
│     · envelope quando possível                               │
│     · KMS/HSM para a chave-raiz                              │
├──────────────────────────────────────────────────────────────┤
│  3. USO                                                      │
│     · subchaves por propósito (HKDF com rótulo)              │
│     · ⚠ nunca reusar entre cifra e MAC                        │
│     · nonce único por chave                                  │
├──────────────────────────────────────────────────────────────┤
│  4. ROTAÇÃO                                                  │
│     · campo de VERSÃO no formato                             │
│     · envelope para não recifrar dado                        │
│     · período definido, e ANTES do vencimento                 │
│     · ⚠ e rotação após suspeita, não só por calendário        │
├──────────────────────────────────────────────────────────────┤
│  5. REVOGAÇÃO / DESTRUIÇÃO                                   │
│     · chave antiga mantida só para LER                       │
│     · destruída após decifrar o que estava cifrado com ela   │
│     · ⚠ destruir ≠ apagar arquivo (backup, snapshot!)         │
└──────────────────────────────────────────────────────────────┘
```

⚠ **A linha da #4 é o coração do módulo.** **"Período definido"** e **"rotação após suspeita"** são
requisitos separados — e o segundo é o que responde a **incidente**. **Uma chave que vazou precisa
ser rotacionada em horas, não no próximo ciclo anual.**

⚠ **E a #5 tem uma armadilha real:** **destruir a chave não é apagar o arquivo.** Backups,
snapshots e replicação **mantêm a chave viva**. **Destruição de verdade exige `crypto-shredding`** —
destruir **a chave** (e não o dado), e garantir que **nenhuma cópia** dela exista.

```bash
echo "═══ 6. o formato com versão — o que torna rotação possível ═══"
python3 - <<'PY'
import os, secrets, struct, time
from Crypto.Cipher import AES

MAGIC = b"CTv1"

class Cofre:
    """
    Formato de cyphertext COM versão de chave.
    ⚠ é essa versão que permite rotacionar sem recifrar o dado.
    """
    def __init__(self):
        self.chaves = {}          # {versao: chave}
        self.atual = 0

    def nova_chave(self):
        self.atual += 1
        self.chaves[self.atual] = secrets.token_bytes(32)
        return self.atual

    def cifra(self, dado, aad=b""):
        v = self.atual
        nonce = secrets.token_bytes(12)
        c = AES.new(self.chaves[v], AES.MODE_GCM, nonce=nonce)
        if aad: c.update(aad)
        ct, tag = c.encrypt_and_digest(dado)
        # ⚠ formato: magic | versao(1B) | nonce(12) | tag(16) | ct
        return MAGIC + bytes([v]) + nonce + tag + ct

    def decifra(self, pacote, aad=b""):
        if not pacote.startswith(MAGIC):
            raise ValueError("formato desconhecido")
        v = pacote[4]
        if v not in self.chaves:
            raise ValueError(f"chave versao {v} indisponivel")
        nonce, tag, ct = pacote[5:17], pacote[17:33], pacote[33:]
        c = AES.new(self.chaves[v], AES.MODE_GCM, nonce=nonce)
        if aad: c.update(aad)
        return c.decrypt_and_verify(ct, tag)

cofre = Cofre()
print("═══ 1. geração ═══")
v1 = cofre.nova_chave()
print(f"  chave versao {v1} criada")
print()

print("═══ 2. uso — cifrar 3 mensagens ═══")
msgs = [cofre.cifra(f"segredo numero {i}".encode()) for i in range(3)]
for i, m in enumerate(msgs):
    print(f"  msg {i}: versao={m[4]}  {len(m)} bytes")
print()

print("═══ 3. rotação ═══")
v2 = cofre.nova_chave()
print(f"  chave versao {v2} criada")
print(f"  a chave antiga ({v1}) continua no cofre, só para LER")
msgs.append(cofre.cifra(b"segredo apos rotacao"))
print(f"  msg 3: versao={msgs[-1][4]}  ← cifrada com a chave NOVA")
print()

print("═══ 4. leitura de mensagens antigas E novas ═══")
for i, m in enumerate(msgs):
    print(f"  msg {i} (versao {m[4]}): {cofre.decifra(m).decode()}")
print("  ✓ as antigas continuam legíveis — a chave velha ficou no cofre")
print("  ✓ e NADA foi recifrado")
print()

print("═══ 5. revogação (destruição da chave antiga) ═══")
del cofre.chaves[v1]
print(f"  chave versao {v1} destruída")
for i in [0, 3]:
    try:
        cofre.decifra(msgs[i])
        print(f"  msg {i}: ⚠ ainda legível")
    except Exception as e:
        print(f"  msg {i}: ✓ {e}")
print()
print("  ⚠ destruir a chave torna o dado IRRECUPERÁVEL —")
print("     é o 'crypto-shredding': destrói a chave, não o dado.")
print("  ⚠ e lembre: apagar o arquivo NÃO destrói a chave se ela")
print("     está em backup, snapshot ou réplica.")
PY
```

⚠ **A saída mostra a rotação funcionando sem recifrar nada.** O campo **`versao`** é o que permite
isso — e é a **linha de projeto** que o módulo recomenda.

⚠ **E o `crypto-shredding` é a técnica de destruição que funciona em dado replicado.** Você **não**
consegue apagar o dado de todo backup — **mas consegue destruir a chave**, e sem ela o dado é
**inútil**. **É o que a LGPD chama de eliminação, aplicada a dado cifrado.**

**Produza `ciclo-vida.md`:**

| Etapa | O que fazer | O que dá errado |
|---|---|---|
| Geração | | |
| Distribuição | | |
| Uso | | |
| Rotação | | |
| Destruição | | |

**Responda:**

1. **O que o campo de versão permite** que sem ele é impossível?
2. Quantos bytes o campo de versão custou? Valeu a pena?
3. **O que é `crypto-shredding`**, e por que apagar arquivo não basta?
4. Por que "rotação após suspeita" é diferente de "rotação por calendário"?

---

## 4.7 LAB — Ciclo de vida aplicado

**Duração:** 120 min

### Passo 1 — KDF de senha versus KDF de chave (35 min)

```bash
cd ~/crypto-lab/mod04

cat > kdf-completo.py <<'PY'
#!/usr/bin/env python3
"""kdf-completo.py — as duas famílias de KDF, com parâmetro e medida."""
import hashlib, hmac, os, secrets, time

# ═══════════════════════════════════════════════════════════
# KDF DE SENHA — lento de propósito
# ═══════════════════════════════════════════════════════════
def senha_hash_argon2(senha: bytes, salt: bytes = None, memoria_mb=64, iteracoes=3):
    """✓ A escolha correta em 2026."""
    from argon2.low_level import hash_secret_raw, Type
    if salt is None:
        salt = secrets.token_bytes(16)
    h = hash_secret_raw(senha, salt, iteracoes, memoria_mb * 1024, 1, 32, Type.ID)
    return salt, h

def senha_hash_pbkdf2(senha: bytes, salt: bytes = None, iteracoes=600_000):
    """⚠ Último recurso — paralelizável em GPU."""
    if salt is None:
        salt = secrets.token_bytes(16)
    h = hashlib.pbkdf2_hmac("sha256", senha, salt, iteracoes, 32)
    return salt, h

def senha_verifica(senha, salt, esperado, funcao="argon2", **kw):
    """✓ comparação em tempo constante (módulo 1)"""
    _, h = (senha_hash_argon2 if funcao == "argon2" else senha_hash_pbkdf2)(senha, salt, **kw)
    return hmac.compare_digest(h, esperado)

# ═══════════════════════════════════════════════════════════
# KDF DE CHAVE — rápido, para estender e separar
# ═══════════════════════════════════════════════════════════
def hkdf(ikm, salt, info, length=32):
    """HKDF (RFC 5869) — rápido, determinístico."""
    prk = hmac.new(salt or b"\x00"*32, ikm, hashlib.sha256).digest()
    out, t, i = b"", b"", 1
    while len(out) < length:
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        out += t
        i += 1
    return out[:length]


if __name__ == "__main__":
    print("═══ KDF DE SENHA ═══")
    print()
    senha = b"minha-senha-fraca"

    t0 = time.perf_counter()
    salt_a, h_a = senha_hash_argon2(senha)
    t_argon = time.perf_counter() - t0
    print(f"  argon2id 64MB/3it : {t_argon*1000:7.1f} ms")
    print(f"    salt  : {salt_a.hex()}")
    print(f"    hash  : {h_a.hex()[:32]}...")

    t0 = time.perf_counter()
    salt_p, h_p = senha_hash_pbkdf2(senha)
    t_pbk = time.perf_counter() - t0
    print(f"  pbkdf2 600k       : {t_pbk*1000:7.1f} ms")
    print(f"    hash  : {h_p.hex()[:32]}...")

    print()
    print("  ✓ verificação correta:", senha_verifica(senha, salt_a, h_a))
    print("  ✓ senha errada       :", senha_verifica(b"outra-senha", salt_a, h_a))
    print()
    print("  ── a mesma senha, dois salts ──")
    s1, h1 = senha_hash_argon2(senha)
    s2, h2 = senha_hash_argon2(senha)
    print(f"    salt1 == salt2? {s1 == s2}")
    print(f"    hash1 == hash2? {h1 == h2}")
    print("  ✓ salts diferentes → hashes diferentes. É para isso que serve o salt.")
    print()

    print("═══ KDF DE CHAVE ═══")
    print()
    chave_mestre = secrets.token_bytes(32)
    salt_hkdf = secrets.token_bytes(16)

    t0 = time.perf_counter()
    for _ in range(10_000):
        hkdf(chave_mestre, salt_hkdf, b"app/encryption")
    t_hkdf = (time.perf_counter() - t0) / 10_000
    print(f"  HKDF              : {t_hkdf*1e6:7.2f} µs")
    print(f"    ⚠ {t_argon/t_hkdf:,.0f}× mais rápido que o argon2")
    print()

    print("  ── a diferença que importa ──")
    print()
    print("  ┌────────────────────┬──────────────┬──────────────────┐")
    print("  │ KDF                │ tempo        │ uso              │")
    print("  ├────────────────────┼──────────────┼──────────────────┤")
    print(f"  │ argon2id           │ {t_argon*1000:8.1f} ms │ senha de usuário │")
    print(f"  │ pbkdf2 600k        │ {t_pbk*1000:8.1f} ms │ legado           │")
    print(f"  │ hkdf               │ {t_hkdf*1e6:8.2f} µs │ derivar chave    │")
    print("  └────────────────────┴──────────────┴──────────────────┘")
    print()
    print("  ⚠ usar argon2 por mensagem cifrada tornaria o sistema inusável.")
    print("  ⚠ usar hkdf sobre senha de usuário deixaria a senha quebrável.")
    print("  ✓ cada família no SEU lugar.")
PY

python3 kdf-completo.py 2>/dev/null || {
    echo "  (instale argon2: pip3 install argon2-cffi)"
    python3 -c "
import hashlib, hmac, secrets, time
senha=b'minha-senha'
t0=time.perf_counter(); hashlib.pbkdf2_hmac('sha256',senha,b'salt',600000,32); print(f'  pbkdf2 600k: {(time.perf_counter()-t0)*1000:.1f} ms')
t0=time.perf_counter()
for _ in range(10000): hmac.new(b'\x00'*32, b'x', hashlib.sha256).digest()
print(f'  hmac rapido: {(time.perf_counter()-t0)/10000*1e6:.2f} us')
"
}
```

Produza `kdf-medido.md`:

| KDF | Tempo | Uso |
|---|---|---|
| argon2id | | |
| PBKDF2 600k | | |
| HKDF | | |

**Responda:**

1. **Qual a razão de tempo** entre argon2 e HKDF?
2. O que acontece se você usar **HKDF sobre senha**?
3. O que acontece se você usar **argon2 por mensagem**?
4. **O salt** muda alguma coisa para a mesma senha?

### Passo 2 — O cofre com rotação (45 min)

```bash
cd ~/crypto-lab/mod04
cp ../mod03/../mod04/kdf-completo.py . 2>/dev/null

cat > cofre.py <<'PY'
#!/usr/bin/env python3
"""cofre.py — formato de cyphertext com versão de chave, e rotação."""
import os, secrets, json, base64, time
from Crypto.Cipher import AES
from argon2.low_level import hash_secret_raw, Type

MAGIC = b"CVv1"
VERSAO_FORMATO = 1

class Cofre:
    def __init__(self, caminho_meta=None):
        self.caminho = caminho_meta
        self.chaves = {}      # versao -> chave
        self.atual = 0
        self.criada_em = {}   # versao -> timestamp
        self._carrega()

    # ── persistência do METADADO (não das chaves em claro) ──
    def _carrega(self):
        if self.caminho and os.path.exists(self.caminho):
            with open(self.caminho) as f:
                meta = json.load(f)
            self.atual = meta["atual"]
            self.criada_em = {int(k): v for k, v in meta["criada_em"].items()}

    def _salva(self):
        if not self.caminho: return
        tmp = self.caminho + ".tmp"
        with open(tmp, "w") as f:
            json.dump({"atual": self.atual, "criada_em": self.criada_em,
                       "versao_formato": VERSAO_FORMATO}, f)
        os.replace(tmp, self.caminho)

    def nova_chave(self):
        self.atual += 1
        self.chaves[self.atual] = secrets.token_bytes(32)
        self.criada_em[self.atual] = time.time()
        self._salva()
        return self.atual

    def cifra(self, dado, aad=b""):
        if self.atual == 0: raise RuntimeError("nenhuma chave")
        v = self.atual
        nonce = secrets.token_bytes(12)
        c = AES.new(self.chaves[v], AES.MODE_GCM, nonce=nonce)
        if aad: c.update(aad)
        ct, tag = c.encrypt_and_digest(dado)
        # ⚠ v é 1 byte → até 255 versões. Para mais, use 4 bytes.
        return MAGIC + bytes([v]) + nonce + tag + ct

    def decifra(self, pacote, aad=b""):
        if not pacote.startswith(MAGIC): raise ValueError("formato")
        v = pacote[4]
        if v not in self.chaves: raise ValueError(f"versao {v} indisponivel")
        nonce, tag, ct = pacote[5:17], pacote[17:33], pacote[33:]
        c = AES.new(self.chaves[v], AES.MODE_GCM, nonce=nonce)
        if aad: c.update(aad)
        return c.decrypt_and_verify(ct, tag)

    def revoga(self, versao):
        """⚠ crypto-shredding: destrói a CHAVE, não o dado."""
        self.chaves.pop(versao, None)

    def idade(self, versao):
        return time.time() - self.criada_em.get(versao, time.time())


class CofreSenha:
    """
    Envelope de chave protegido por SENHA do usuário.

    ⚠ a senha NÃO cifra o dado — ela protege a CHAVE.
       Isso permite trocar a senha sem recifrar o dado.
    """
    def __init__(self, senha: bytes, cofre: Cofre):
        self.cofre = cofre
        self.salt = secrets.token_bytes(16)
        # KDF lento sobre a senha → chave de proteção
        self.k_protecao = hash_secret_raw(senha, self.salt, 3, 64*1024, 1, 32, Type.ID)

    def nova_chave_protegida(self):
        """gera uma DEK e a guarda protegida pela senha"""
        from Crypto.Cipher import AES as A
        dek = secrets.token_bytes(32)
        k = self.k_protecao
        c = A.new(k, A.MODE_GCM, nonce=secrets.token_bytes(12))
        ct, tag = c.encrypt_and_digest(dek)
        self.dek_protegida = (c.nonce, tag, ct)
        return dek

    def abre(self, nonce, tag, ct):
        from Crypto.Cipher import AES as A
        c = A.new(self.k_protecao, A.MODE_GCM, nonce=nonce)
        return c.decrypt_and_verify(ct, tag)


if __name__ == "__main__":
    import tempfile
    print("═══ CICLO DE VIDA COMPLETO ═══")
    print()

    meta = tempfile.mktemp(suffix=".json")
    cofre = Cofre(meta)

    print("── 1. geração ──")
    v1 = cofre.nova_chave()
    print(f"   chave versao {v1} criada")
    print()

    print("── 2. uso ──")
    msgs = [cofre.cifra(f"segredo {i}".encode(), aad=b"user:1000") for i in range(3)]
    for i, m in enumerate(msgs):
        print(f"   msg {i}: {len(m)} bytes, versao={m[4]}")
    print()

    print("── 3. rotação ──")
    v2 = cofre.nova_chave()
    msgs.append(cofre.cifra(b"segredo pos-rotacao", aad=b"user:1000"))
    print(f"   chave versao {v2} criada")
    print(f"   msg 3 cifrada com versao {msgs[-1][4]}")
    print(f"   ⚠ nada foi recifrado")
    print()

    print("── 4. leitura cruzada ──")
    for i, m in enumerate(msgs):
        print(f"   msg {i} (v{m[4]}): {cofre.decifra(m, aad=b'user:1000').decode()}")
    print("   ✓ mensagens antigas e novas coexistem")
    print()

    print("── 5. AAD amarrando contexto ──")
    try:
        cofre.decifra(msgs[0], aad=b"user:9999")
        print("   ⚠ AAD errado ACEITO (não deveria)")
    except Exception:
        print("   ✓ AAD errado REJEITADO — a msg não pode ser movida de contexto")
    print()

    print("── 6. revogação (crypto-shredding) ──")
    cofre.revoga(v1)
    print(f"   chave versao {v1} destruída")
    for i in [0, 3]:
        try:
            print(f"   msg {i}: {cofre.decifra(msgs[i], aad=b'user:1000').decode()}")
            print("        ⚠ ainda legível")
        except Exception as e:
            print(f"   msg {i}: ✓ {e}")
    print()
    print("   ⚠ o DADO continua no disco. A CHAVE foi destruída.")
    print("      sem a chave, o dado é inútil → crypto-shredding")
    print()

    print("── 7. proteção por senha (envelope) ──")
    cofre2 = Cofre()
    cofre2.nova_chave()
    cs = CofreSenha(b"senha-do-usuario", cofre2)
    dek = cs.nova_chave_protegida()
    n, t, c = cs.dek_protegida
    print(f"   DEK gerada      : {dek.hex()[:32]}...")
    print(f"   DEK protegida   : {len(c)} bytes (nonce {len(n)}, tag {len(t)})")
    print(f"   salt            : {cs.salt.hex()}")
    print()
    print("   ⚠ a senha protege a DEK, não o dado.")
    print("      trocar a senha = recifrar a DEK (32 bytes),")
    print("      não o dado inteiro. É o valor do envelope.")

    os.unlink(meta) if os.path.exists(meta) else None
PY

python3 cofre.py
```

Produza `cofre.md`:

| Etapa | O que aconteceu | O que se preservou |
|---|---|---|
| Geração | | |
| Uso | | |
| Rotação | | |
| Leitura cruzada | | |
| Revogação | | |

**Responda:**

1. **Quantas mensagens ficaram legíveis** após a rotação?
2. **Alguma foi recifrada?**
3. O AAD errado foi aceito? **O que isso garante?**
4. **O que a revogação destruiu** — o dado, ou algo mais?

### Passo 3 — A regra de chave (40 min)

Produza `regra-chave.md` — o padrão que você usará:

```markdown
# Regra de gerenciamento de chave

## 1. Geração
- [ ] CSPRNG (`os.urandom`/`getrandom`/`crypto.randomBytes`)
- [ ] Nunca de senha, tempo, pid ou contador reiniciável
- [ ] Em VM clonada: RNG do host passado ao guest
- [ ] Comprimento: 256 bits simétrico, 3072+ RSA, 256 ECC

## 2. Tipos — não reusar
| Uso | Chave própria |
|---|---|
| Cifra | ✓ derivar com rótulo "encryption" |
| MAC | ✓ derivar com rótulo "authentication" |
| Envelope | ✓ derivar com rótulo "key-wrapping" |
| Índice | ✓ derivar com rótulo "storage-index" |

## 3. Armazenamento
- [ ] NUNCA no código-fonte
- [ ] NUNCA no cliente (JS, app)
- [ ] KMS/HSM para chave-raiz
- [ ] `.env` só com `600`, e nunca em repositório
- [ ] Segredo por ambiente (dev/staging/prod)

## 4. Uso
- [ ] Subchaves via HKDF com rótulo
- [ ] Nonce único por chave (módulo 3)
- [ ] Comparação em tempo constante
- [ ] AAD amarrando contexto

## 5. Rotação
- [ ] ⚠ CAMPO DE VERSÃO no formato do cyphertext
- [ ] Envelope, para não recifrar dado
- [ ] Período definido E rotação após suspeita
- [ ] Chave nova em uso; antiga só para ler

## 6. Destruição
- [ ] Chave antiga destruída após decifrar o legado
- [ ] ⚠ apagar arquivo NÃO destrói backupe/snapshot
- [ ] `crypto-shredding` para dado replicado

## 7. Auditoria
```bash
grep -rEn '(KEY|SECRET|PASSWORD)\s*=\s*["\x27]' <código>   # chave no código
grep -rEn 'key_?version|kid' <código>                      # campo de versão
stat -c '%a %n' $(find . -name '.env' -o -name '*.key')     # permissão
```
```

**Responda:**

1. **Qual item da rotação você consideraria mais crítico?**
2. Por que **segredo por ambiente** (dev/prod) importa?
3. Qual item você **não conseguiria aplicar** sem mudar o formato do dado?
4. **Se você pudesse fazer só um item**, qual daria mais segurança?

### Critérios de aceitação

- `tipos-chave.md` com os quatro tipos e a resposta sobre reuso.
- Você demonstrou **HKDF derivando quatro chaves independentes** do mesmo segredo.
- `kdf.md` com os **quatro** tempos medidos.
- Você explicou por que **argon2 vence a GPU** e por que **HKDF em senha é erro**.
- `ecdh.md` com o caso honesto e o **caso MITM**, e a chave do MITM.
- Você explicou o que o **ECDH não resolve** e como o TLS 1.3 resolve.
- `envelope.md` com as **quatro** métricas comparadas.
- Você explicou por que RSA **não cifra 1 MB**.
- `erros-chave.md` com os **cinco** erros buscados no código.
- Você explicou por que **chave no cliente é ofuscação**.
- `cofre.py` rodando, com **rotação sem recifragem**.
- Você demonstrou o **AAD rejeitando contexto errado**.
- Você demonstrou **crypto-shredding** (chave destruída, dado irrecuperável).
- `regra-chave.md` com as **sete** seções.
- Você explicou por que **apagar arquivo não destrói a chave**.

---

## Avaliação

1. Por que toda a segurança **mora na chave**, se o algoritmo é público?
2. Cite os quatro tipos de chave e o que acontece se você reusar.
3. **O que o HKDF faz?** O que é o rótulo (`info`) e por que ele importa?
4. **Diferencie KDF de senha de KDF de chave.** Por que um é lento e o outro rápido?
5. Cite os parâmetros do argon2id em 2026. Qual o mais importante?
6. **Por que argon2 vence a GPU** onde o PBKDF2 não vence?
7. Por que PBKDF2 é "último recurso"? Quantas iterações ele exige?
8. **Como o ECDH chega à mesma chave** sem transmiti-la?
9. **O que o ECDH sozinho não resolve?** Descreva o MITM.
10. Como o TLS 1.3 combina ECDHE e assinatura?
11. Por que **X25519** em vez de P-256?
12. **Por que RSA não cifra 1 MB?** Qual o limite?
13. Descreva o envelope de chave em quatro passos.
14. **Por que envelope torna a rotação viável?** Explique com números.
15. Como compartilhar um arquivo com cinco pessoas com envelope?
16. **Cite os cinco erros de gerenciamento de chave.**
17. **Por que "chave no cliente" é ofuscação**, não segurança?
18. **Por que falta de campo de versão impede rotação?**
19. O que é **crypto-shredding**, e por que apagar arquivo não basta?
20. **Por que "rotação após suspeita" é diferente de "rotação por calendário"?**

---

**Próximo:** [Módulo 5 — Hash, MAC e assinatura](modulo-05.md)
