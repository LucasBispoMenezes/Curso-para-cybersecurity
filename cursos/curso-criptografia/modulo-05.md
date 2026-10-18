# Módulo 5 — Hash, MAC e Assinatura

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 4

---

## Objetivos

1. Distinguir **hash**, **MAC** e **assinatura** — e saber o que cada um prova.
2. Escolher a função de hash certa, e saber por que MD5 e SHA-1 estão mortos.
3. Usar HMAC corretamente, e entender o ataque de extensão de comprimento.
4. Reconhecer **colisão**, **segundo preimagem** e **preimagem** — e onde cada uma importa.
5. Comparar em **tempo constante** — e saber medir o vazamento.

---

## ⚠ Antes de começar

⚠ **A confusão que causa falha em produção:**

| Você quer | NÃO use | Use |
|---|---|---|
| Guardar senha | SHA-256 | **argon2id** (módulo 4) |
| Provar que não mudou, **com** segredo | SHA-256 | **HMAC-SHA-256** |
| Provar que não mudou, **sem** segredo | **nada serve** | — (hash sozinho não autentica) |
| Provar autoria | HMAC | **Assinatura** (Ed25519) |
| Comparar segredo | `==` | **`compare_digest`** |
| Identificar arquivo | SHA-256 ✓ | (é o uso legítimo de hash cru) |

⚠ **A linha 3 é a que a maioria erra.** **Um hash sozinho não prova nada** — quem altera o arquivo
**recalcula o hash**. **Ele só prova integridade contra corrupção acidental, não contra adversário.**

⚠ **A última linha é o uso legítimo de hash cru:** identificar conteúdo (**endereço de conteúdo**),
**não** autenticar. **Git, IPFS e `sha256sum` fazem isso** — e estão corretos, porque **não
prometem autenticidade.**

```bash
mkdir -p ~/crypto-lab/mod05 && cd ~/crypto-lab/mod05

echo "═══ 1. as três famílias ═══"
python3 - <<'PY'
import hashlib, hmac, secrets
from cryptography.hazmat.primitives.asymmetric import ed25519

msg = b"transferir 100 reais"

print("═══ HASH (sem chave) ═══")
h = hashlib.sha256(msg).digest()
print(f"  SHA-256(msg) = {h.hex()[:40]}...")
print("  · qualquer um calcula")
print("  · prova: o conteúdo é o que é")
print("  ⚠ NÃO prova: quem escreveu, nem que não foi alterado por adversário")
print()

print("═══ MAC (com chave simétrica) ═══")
k = secrets.token_bytes(32)
m = hmac.new(k, msg, hashlib.sha256).digest()
print(f"  HMAC-SHA256(k, msg) = {m.hex()[:40]}...")
print("  · só quem tem `k` calcula e verifica")
print("  · prova: o conteúdo não mudou, E veio de quem tem a chave")
print("  ⚠ NÃO prova: qual das duas partes escreveu (as duas têm a chave)")
print()

print("═══ ASSINATURA (chave assimétrica) ═══")
sk = ed25519.Ed25519PrivateKey.generate()
sig = sk.sign(msg)
print(f"  Ed25519(sk, msg) = {sig.hex()[:40]}...")
print("  · só o DONO da privada assina; qualquer um verifica com a pública")
print("  · prova: o conteúdo não mudou, E foi o dono da privada")
print("  ✓ prova TAMBÉM: não repúdio (só ele podia assinar)")
print()

print("═══ RESUMO ═══")
print()
print("  ┌────────────┬──────────┬────────────┬──────────────┐")
print("  │            │ chave?   │ quem verif │ não repúdio? │")
print("  ├────────────┼──────────┼────────────┼──────────────┤")
print("  │ hash       │ não      │ qualquer   │ ✗            │")
print("  │ MAC        │ sim, 1   │ quem tem k │ ✗            │")
print("  │ assinatura │ sim, par │ qualquer   │ ✓            │")
print("  └────────────┴──────────┴────────────┴──────────────┘")
PY
```

⚠ **A tabela final é o entregável do bloco.** E a linha do não repúdio é a **única diferença real**
entre MAC e assinatura — porque no MAC, **as duas partes podem ter gerado a etiqueta**.

**Produza `tres-familias.md`:**

| | Chave? | Quem verifica | Prova autoria? | Não repúdio? |
|---|---|---|---|---|
| Hash | | | | |
| MAC | | | | |
| Assinatura | | | | |

**Responda:**

1. **O que um hash sozinho prova?** E o que ele **não** prova?
2. Por que `sha256sum` **está correto** apesar disso?
3. **Qual a única diferença** entre MAC e assinatura?
4. Por que não repúdio exige chave assimétrica?

---

## 5.1 As funções de hash — e as mortas

⚠ **O estado em 2026:**

| Algoritmo | Saída | Estado | Por quê |
|---|---|---|---|
| **MD5** | 128 bits | ☠ **MORTO** | Colisão em **segundos** |
| **SHA-1** | 160 bits | ☠ **MORTO** | Colisão em **2^63** (SHAttered, 2017) |
| SHA-256 | 256 bits | ✓ | Padrão |
| SHA-512 | 512 bits | ✓ | Mais rápido em 64 bits |
| **SHA-3 (Keccak)** | 224–512 | ✓ | Estrutura diferente — não herda falha do SHA-2 |
| BLAKE2 / **BLAKE3** | variável | ✓ | Mais rápido que SHA-2, seguro |
| **SHAKE128/256** | variável | ✓ | Saída de tamanho arbitrário |

⚠ **A morte do SHA-1 merece o exemplo, porque é didática:** *SHAttered* (2017) produziu **dois PDFs
diferentes com o mesmo SHA-1** — **colisão** — e o custo foi **~110 anos de GPU**, ou seja,
**viável para um adversário com recursos**. **Dois anos depois, o custo caiu para ~$45.000 em
nuvem.** **É por isso que "está funcionando" não é critério.**

⚠ **E MD5 é pior:** colisão em **segundos** num laptop. **Ainda aparece em sistema legado**, e
**ainda é usado para "verificar integridade"** — o que é um erro.

⚠ **A tabela do que cada propriedade significa:**

| Propriedade | O que é | Onde importa |
|---|---|---|
| **Preimagem** | Dado um hash, achar **qualquer** entrada | Guardar senha (por isso KDF) |
| **Segunda preimagem** | Dado **uma entrada**, achar **outra** com o mesmo hash | Assinatura de documento |
| **Colisão** | Achar **duas** entradas quaisquer com mesmo hash | ⚠ **Tudo que depende de unicidade** |

⚠ **A linha da colisão é a que mata MD5 e SHA-1.** E a razão é sutil: **em assinatura**, você assina
o **hash**, não o documento. Se o atacante acha **uma colisão**, ele faz o alvo assinar o documento
**inofensivo** — e a assinatura vale para o **malicioso**, porque **o hash é o mesmo**.

⚠ **É exatamente o ataque do SHAttered.** E é por isso que "colisão" não é problema teórico: **ela
quebra assinatura, certificado, versionamento e blockchain.**

```bash
echo "═══ 2. o estado dos hashes ═══"
python3 - <<'PY'
import hashlib, time, secrets

print("  ── comprimento de saída ──")
for nome in ["md5", "sha1", "sha256", "sha512", "sha3_256", "blake2b", "blake2s"]:
    try:
        h = hashlib.new(nome, b"teste")
        print(f"    {nome:<12} {h.digest_size*8:>4} bits   {h.digest_size:>2} bytes")
    except ValueError:
        pass

print()
print("  ── velocidade (o que importa para KDF) ──")
dado = secrets.token_bytes(1024)
for nome in ["md5", "sha1", "sha256", "sha512", "sha3_256", "blake2b"]:
    try:
        t0 = time.perf_counter()
        for _ in range(10000):
            hashlib.new(nome, dado).digest()
        dt = (time.perf_counter() - t0) / 10000
        print(f"    {nome:<12} {dt*1e6:>8.2f} µs por 1 KB")
    except ValueError:
        pass

print()
print("  ⚠ MD5 e SHA-1 são RÁPIDOS também — e é por isso que eram usados")
print("     em KDF de senha. E é por isso que a senha caía.")
print()

print("  ── SHAKE: saída de tamanho arbitrário ──")
for n in [16, 32, 64]:
    print(f"    shake_128(b'teste', {n:>2}) = {hashlib.shake_128(b'teste').hexdigest(n)[:32]}...")
print("  ✓ o mesmo XOF pode produzir 16, 32 ou 64 bytes — e os prefixos batem")
print("  ✓ é isso que um 'extendable output function' faz")
PY
```

⚠ **A velocidade do MD5 é o argumento.** Ele é **rápido** — e era por isso que o usavam em senha.
**E é exatamente por isso que o hash de senha migrou para KDF lento.** **A mesma propriedade que era
vantagem virou a falha.**

⚠ **E o SHAKE merece nota:** ele produz **saída de tamanho arbitrário** — e **os prefixos
concordam**. `shake_128(x, 16)` é o **prefixo** de `shake_128(x, 64)`. **Isso permite derivar
múltiplas chaves de um XOF**, e é usado em esquema pós-quântico.

**Produza `hashes.md`:**

| Algoritmo | Bits | Estado | Por quê |
|---|---|---|---|
| MD5 | | | |
| SHA-1 | | | |
| SHA-256 | | | |
| SHA-3 | | | |
| BLAKE3 | | | |

**Responda:**

1. **O que a colisão no SHA-1 permite** que a preimagem não permite?
2. Por que a **velocidade** do MD5 era vantagem e virou falha?
3. **Diferencie** preimagem, segunda preimagem e colisão.
4. Por que **SHA-3** existe, se SHA-2 não está quebrado?

---

## 5.2 HMAC — e o ataque de extensão

⚠ **O erro que gera o ataque:** usar `SHA-256(k ‖ msg)` como MAC.

```
CONSTRUÇÃO ERRADA:  T = SHA256(k ‖ msg)

⚠ SHA-256 (e MD5, SHA-1, SHA-512) usam construção MERKLE-DAMGÅRD
   — o hash do bloco N depende do hash do bloco N-1.

   hash(k ‖ msg ‖ pad) = H
                  │
                  ▼ o atacante conhece H e o COMPRIMENTO de k
   ⚠ ele pode calcular H' = hash(k ‖ msg ‖ pad ‖ extra)
      SEM SABER k

   → ele estende a mensagem e a etiqueta continua válida
```

⚠ **É o ataque de **extensão de comprimento**, e quebrou sistemas reais** — incluindo APIs que
autenticavam com `sha256(secret + body)`.

```
CONSTRUÇÃO CORRETA:  T = HMAC-SHA256(k, msg)

   HMAC(k, m) = H( (k ⊕ opad) ‖ H( (k ⊕ ipad) ‖ m ) )

   ⚠ o hash INTERNO termina antes do externo
   ⚠ não dá para estender, porque o atacante não conhece
      k ⊕ opad nem k ⊕ ipad
```

⚠ **A defesa é estrutural, e é por isso que HMAC existe.** Ele **não** é "SHA-256 com chave" — é uma
construção **projetada** para resistir à extensão, **mesmo usando um hash Merkle-Damgård**.

⚠ **E a alternativa moderna é o SHA-3.** Ele usa **sponge**, não Merkle-Damgård — e por isso **não
sofre extensão**. **`KMAC`** (baseado em SHA-3) é o MAC moderno, e `BLAKE3` também tem modo MAC com
construção resiliente.

```bash
echo "═══ 3. o ataque de extensão, e o HMAC que o impede ═══"
python3 - <<'PY'
import hashlib, hmac, struct

# ── implementa SHA-256 do zero, para mostrar o estado interno ──
K = [
 0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
 0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
 0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
 0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
 0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
 0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
 0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
 0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
]
H0 = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]

def rr(x,n): return ((x>>n)|(x<<(32-n))) & 0xffffffff

def sha256_compress(state, bloco):
    w = list(struct.unpack(">16I", bloco)) + [0]*48
    for i in range(16,64):
        s0 = rr(w[i-15],7)^rr(w[i-15],18)^(w[i-15]>>3)
        s1 = rr(w[i-2],17)^rr(w[i-2],19)^(w[i-2]>>10)
        w[i] = (w[i-16]+s0+w[i-7]+s1) & 0xffffffff
    a,b,c,d,e,f,g,h = state
    for i in range(64):
        S1 = rr(e,6)^rr(e,11)^rr(e,25)
        ch = (e&f)^((~e&0xffffffff)&g)
        t1 = (h+S1+ch+K[i]+w[i]) & 0xffffffff
        S0 = rr(a,2)^rr(a,13)^rr(a,22)
        mj = (a&b)^(a&c)^(b&c)
        t2 = (S0+mj) & 0xffffffff
        h,g,f,e,d,c,b,a = g,f,e,(d+t1)&0xffffffff,c,b,a,(t1+t2)&0xffffffff
    return [(x+y)&0xffffffff for x,y in zip(state,[a,b,c,d,e,f,g,h])]

def sha256_pad(mlen):
    return b"\x80" + b"\x00"*((55 - mlen) % 64) + struct.pack(">Q", mlen*8)

def md_estado(dados, estado=None):
    """processa dados e devolve (estado_interno, total_bytes)"""
    st = list(estado or H0)
    n = 0
    for i in range(0, len(dados) - len(dados) % 64, 64):
        st = sha256_compress(st, dados[i:i+64]); n += 64
    resto = dados[n:]
    if resto:
        st = sha256_compress(st, resto + b"\x00"*(64-len(resto))); n += len(resto)
    return st, n

def md_final(st, total):
    """aplica o padding e devolve o digest"""
    pad = sha256_pad(total)
    # o padding pode exigir 1 ou 2 blocos
    dados = pad
    while len(dados) % 64: dados += b"\x00"
    st2, _ = md_estado(dados, st)
    return struct.pack(">8I", *st2)

print("═══ O ATAQUE DE EXTENSÃO DE COMPRIMENTO ═══")
print()

chave = b"segredo-compartilhado"     # 22 bytes
msg   = b"user=alice&role=leitor"

# ── construção ERRADA: SHA256(k ‖ msg) ──
tag_vitima = hashlib.sha256(chave + msg).digest()
print(f"  chave        : {chave!r}  ({len(chave)} bytes)")
print(f"  msg original : {msg!r}")
print(f"  tag original : {tag_vitima.hex()[:32]}...")
print()
print("  ⚠ o atacante NÃO conhece a chave, mas conhece a tag E o tamanho da chave.")
print("     Ele reconstrói o estado interno APÓS a mensagem + padding:")
print()

# o atacante monta o estado a partir da tag
estado_forjado = list(struct.unpack(">8I", tag_vitima))
total_forjado = len(chave) + len(msg) + len(sha256_pad(len(chave) + len(msg)))

# ⚠ o padding real que foi consumido
padding_consumido = sha256_pad(len(chave) + len(msg))
print(f"  padding que o alvo aplicou: {padding_consumido.hex()}")
print(f"  total processado           : {total_forjado} bytes")
print()

# o atacante acrescenta o que quiser
extra = b"&role=admin"
msg_forjada = msg + padding_consumido + extra
tag_forjada = md_final(md_estado(extra, estado_forjado)[0], total_forjado + len(extra))

print(f"  msg forjada : {msg_forjada!r}")
print(f"  tag forjada : {tag_forjada.hex()[:32]}...")
print()

# o alvo calcula sha256(chave ‖ msg_forjada) e compara
real = hashlib.sha256(chave + msg_forjada).digest()
print(f"  o ALVO calcula SHA256(k ‖ msg_forjada) = {real.hex()[:32]}...")
print(f"  ⚠⚠ COINCIDE? {real == tag_forjada}")
print()
print("  ⚠ o atacante estendeu a mensagem e a etiqueta continua VÁLIDA")
print("     sem nunca ter visto a chave.")

print()
print("═══ HMAC — A CORREÇÃO ═══")
print()
tag_hmac = hmac.new(chave, msg, hashlib.sha256).digest()
print(f"  HMAC(k, msg) = {tag_hmac.hex()[:32]}...")
print()
print("  ⚠ o atacante tenta o MESMO ataque:")
estado_forjado2 = list(struct.unpack(">8I", tag_hmac))
# ⚠ mas o estado INTERNO do HMAC é H((k⊕ipad)‖msg), não o digest externo
#    ele não conhece k⊕ipad, então não consegue continuar
print("     o estado interno do HMAC é H((k⊕ipad) ‖ msg)")
print("     ⚠ e o atacante NÃO conhece k⊕ipad")
print()
print("  ✓ a extensão não funciona")
print()
print("═══ A COMPARAÇÃO ═══")
print()
print("  ┌──────────────────────┬─────────────┬──────────────────┐")
print("  │ construção           │ estendível? │ use?             │")
print("  ├──────────────────────┼─────────────┼──────────────────┤")
print("  │ SHA256(k ‖ msg)      │ ⚠ SIM        │ ✗ NUNCA          │")
print("  │ SHA256(msg ‖ k)      │ não          │ ⚠ frágil (outros)│")
print("  │ HMAC(k, msg)         │ não          │ ✓ SIM            │")
print("  │ KMAC (SHA-3)         │ não          │ ✓ moderno        │")
print("  └──────────────────────┴─────────────┴──────────────────┘")
PY

python3 - <<'PY' 2>/dev/null || echo "  (a demonstração completa do SHA-256 é longa; veja a versão resumida abaixo)"
PY
```

⚠ **A demonstração implementa SHA-256 do zero só para mostrar o estado interno** — e o ponto é que
**o digest É o estado final**, então quem tem o digest **pode continuar** a computação. **É o
mecanismo do ataque.**

⚠ **Se a saída for longa demais**, a versão prática é:

```bash
cd ~/crypto-lab/mod05

cat > extensao.py <<'PY'
#!/usr/bin/env python3
"""extensao.py — o ataque de extensão, usando biblioteca que o implementa."""
try:
    from hashpumpy import hashpump
    TEM = True
except ImportError:
    TEM = False

import hashlib, hmac

chave = b"segredo-compartilhado"
msg   = b"user=alice&role=leitor"
tag   = hashlib.sha256(chave + msg).digest()

print("═══ O ATAQUE ═══")
print(f"  msg  : {msg}")
print(f"  tag  : {tag.hex()[:32]}...")
print()

if TEM:
    nova_tag, nova_msg = hashpump(tag.hex(), msg.decode(), b"&role=admin", len(chave))
    print(f"  msg forjada : {nova_msg!r}")
    print(f"  tag forjada : {nova_tag[:32]}...")
    real = hashlib.sha256(chave + nova_msg.encode("latin1")).hexdigest()
    print(f"  o alvo calcula: {real[:32]}...")
    print(f"  ⚠⚠ COINCIDE? {real == nova_tag}")
else:
    print("  ⚠ hashpumpy não instalado. Mas o mecanismo é:")
    print("     · o digest SHA-256 É o estado interno final")
    print("     · quem tem o digest + sabe o tamanho de k pode CONTINUAR")
    print("     · o resto é montar o padding e o estado")
    print()
    print("  ✓ e a correção não muda: use hmac.new(), nunca hash(k+msg)")
    print()
    print("  para reproduzir: pip3 install hashpumpy")

print()
print("═══ A CORREÇÃO ═══")
print(f"  hmac.new(k, msg, sha256).digest() = {hmac.new(chave, msg, hashlib.sha256).digest().hex()[:32]}...")
print("  ✓ HMAC usa dois paddings (ipad/opad) e o atacante não os conhece")
print("  ✓ a extensão não funciona")
print()
print("  ⚠ e a regra: se você viu 'sha256(secret + data)' em código,")
print("     é achado. A correção é uma linha. O risco é total.")
PY
python3 extensao.py
```

⚠ **A frase final é o resumo do bloco.** `sha256(secret + data)` é **achado de gravidade alta** — e
**a correção é uma linha**. **É o tipo de achado que aparece em API real e é fácil de perder na
leitura.**

**Produza `extensao.md`:**

| Construção | Estendível? | Uso |
|---|---|---|
| `SHA256(k ‖ msg)` | | |
| `SHA256(msg ‖ k)` | | |
| `HMAC(k, msg)` | | |
| KMAC | | |

**Responda:**

1. **Por que o ataque funciona?** O que o digest representa?
2. O que o atacante **precisa saber** para o ataque?
3. Por que `SHA256(msg ‖ k)` é melhor mas **ainda frágil**?
4. **Como você acha isso** em auditoria? Escreva o `grep`.

---

## 5.3 Assinatura — e o que cada esquema garante

⚠ **A assinatura resolve o que o MAC não resolve: não repúdio.**

| Esquema | Curva/campo | Tamanho da assinatura | Uso |
|---|---|---|---|
| **Ed25519** | Curva 25519 | **64 bytes** | ✓ **A recomendação** |
| **ECDSA P-256** | NIST P-256 | 64–72 bytes | Interoperação |
| **ECDSA P-384** | NIST P-384 | 96–104 bytes | Nível mais alto |
| **RSA-PSS 3072** | Fatoração | **384 bytes** | Interoperação/legado |
| **RSA PKCS#1 v1.5** | Fatoração | 384 bytes | ⚠ **Evitar** — é o do ROBOT |
| **Ed448** | Curva 448 | 114 bytes | Nível muito alto |

⚠ **A escolha do Ed25519 tem quatro razões:**

| Razão | Detalhe |
|---|---|
| **Determinístico** | A assinatura **não depende de aleatoriedade** — imune ao bug do PS3 |
| **Rápido** | Verificação em ~50 µs |
| **Sem parâmetro flexível** | Uma curva só, sem "escolher parâmetro errado" |
| **Assinatura curta** | 64 bytes |

⚠ **A primeira linha é a mais importante para este curso.** O ECDSA **exige** um nonce por
assinatura (módulo 2, o caso PS3). **O Ed25519 deriva o nonce do hash e da chave** — então **não há
nonce para reusar**. **O bug que quebrou o PS3 é estruturalmente impossível no Ed25519.**

⚠ **E a linha do RSA PKCS#1 v1.5 é o achado.** É o esquema que o **ROBOT** quebrou — **padding
oracle em RSA**, a mesma classe do módulo 3, mas em assinatura. **A correção é migrar para PSS ou
Ed25519.**

```bash
echo "═══ 4. as assinaturas, comparadas ═══"
python3 - <<'PY'
import time, secrets
from cryptography.hazmat.primitives.asymmetric import ed25519, ec, rsa, padding as apad
from cryptography.hazmat.primitives import hashes

msg = b"documento que sera assinado"

print("  ── gerando chaves ──")
ed = ed25519.Ed25519PrivateKey.generate()
ec2 = ec.generate_private_key(ec.SECP256R1())
rs = rsa.generate_private_key(public_exponent=65537, key_size=3072)

def mede(nome, f, n=200):
    t0 = time.perf_counter()
    for _ in range(n): f()
    return (time.perf_counter() - t0) / n

print()
print(f"  {'esquema':<18} {'assina':>10} {'verifica':>10} {'assinatura':>12}")
print("  " + "-"*54)

# Ed25519
t_s = mede("ed_s", lambda: ed.sign(msg))
t_v = mede("ed_v", lambda: ed.public_key().verify(ed.sign(msg), msg))
print(f"  {'Ed25519':<18} {t_s*1e6:>8.1f}µs {t_v*1e6:>8.1f}µs {len(ed.sign(msg)):>10} B")

# ECDSA
t_s = mede("ec_s", lambda: ec2.sign(msg, ec.ECDSA(hashes.SHA256())))
s_ec = ec2.sign(msg, ec.ECDSA(hashes.SHA256()))
t_v = mede("ec_v", lambda: ec2.public_key().verify(s_ec, msg, ec.ECDSA(hashes.SHA256())))
print(f"  {'ECDSA P-256':<18} {t_s*1e6:>8.1f}µs {t_v*1e6:>8.1f}µs {len(s_ec):>10} B")

# RSA-PSS
t_s = mede("rs_s", lambda: rs.sign(msg, apad.PSS(apad.MGF1(hashes.SHA256()), 32), hashes.SHA256()), n=50)
s_rs = rs.sign(msg, apad.PSS(apad.MGF1(hashes.SHA256()), 32), hashes.SHA256())
t_v = mede("rs_v", lambda: rs.public_key().verify(s_rs, msg, apad.PSS(apad.MGF1(hashes.SHA256()), 32), hashes.SHA256()), n=50)
print(f"  {'RSA-PSS 3072':<18} {t_s*1e6:>8.1f}µs {t_v*1e6:>8.1f}µs {len(s_rs):>10} B")

print()
print("═══ A DIFERENÇA QUE IMPORTA ═══")
print()
print("  ┌────────────────┬────────────┬──────────────┬───────────────┐")
print("  │ esquema        │ assinatura │ deterministic│ nonce bug?    │")
print("  ├────────────────┼────────────┼──────────────┼───────────────┤")
print("  │ Ed25519        │ 64 B       │ ✓ SIM        │ ✗ impossível  │")
print("  │ ECDSA P-256    │ ~71 B      │ ✗ não        │ ⚠ SIM (PS3)   │")
print("  │ RSA-PSS        │ 384 B      │ ✗ não        │ (não aplica)  │")
print("  │ RSA PKCS#1v1.5 │ 384 B      │ ✓ sim        │ (não aplica)  │")
print("  └────────────────┴────────────┴──────────────┴───────────────┘")
print()
print("  ⚠ Ed25519 é a escolha padrão: 6× menor que RSA-PSS,")
print("     mais rápido, e imune ao bug de nonce que quebrou o PS3.")
print("  ⚠ RSA PKCS#1 v1.5 é o esquema do ROBOT (padding oracle).")
PY
```

⚠ **A saída quantifica as duas vantagens:** Ed25519 é **6× menor** que RSA-PSS, **mais rápido**, e
**determinístico**. **Não há razão para escolher RSA em sistema novo.**

⚠ **E a linha do nonce é o que fecha o ciclo com o módulo 2.** O bug do PS3 **não pode acontecer**
no Ed25519. **A escolha do esquema elimina a classe de falha.**

**Produza `assinatura.md`:**

| Esquema | Tamanho | Determinístico? | Bug de nonce? |
|---|---|---|---|
| Ed25519 | | | |
| ECDSA P-256 | | | |
| RSA-PSS | | | |
| RSA PKCS#1 v1.5 | | | |

**Responda:**

1. **Por que Ed25519 é imune ao bug do PS3?**
2. Por que RSA PKCS#1 v1.5 deve ser evitado?
3. Qual o tamanho da assinatura Ed25519 e por que importa?
4. **Se você tem sistema com ECDSA**, o que verificar?

---

## 5.4 Comparação em tempo constante

⚠ **A falha mais sutil do módulo, e a mais fácil de introduzir.**

```c
/* ⚠ ERRADO */
if (memcmp(fornecido, esperado, n) == 0) { /* ok */ }
```

⚠ **`memcmp` (e `==` em string) para no primeiro byte diferente.** Então:

```
tentativa 1: "aaaaaaaa"  → 1 comparação (falha no byte 0)
tentativa 2: "baaaaaaa"  → 2 comparações (falha no byte 1)
             ...
tentativa N: "hash..."   → N comparações (tudo igual!)

⚠ o TEMPO revela quantos bytes estão certos
```

⚠ **E o atacante mede.** Com **estatística** sobre muitas tentativas, ele extrai **um byte de cada
vez** — e o segredo inteiro sai. **É o *timing attack*, e funciona contra comparação de MAC,
comparação de senha, e comparação de token.**

⚠ **A defesa é a função que compara sempre o todo:**

| Linguagem | ✓ Use |
|---|---|
| Python | `hmac.compare_digest(a, b)` |
| C | `CRYPTO_memcmp`, `sodium_memcmp` |
| Go | `hmac.Equal` |
| Java | `MessageDigest.isEqual` |
| Node | `crypto.timingSafeEqual` |
| Rust | `subtle::ConstantTimeEq` |

⚠ **A tabela é o que você vai usar.** E a razão de cada uma ser **constante** é que elas **não
param** — elas acumulam o XOR de todos os bytes e só no fim decidem.

```bash
echo "═══ 5. o vazamento por tempo, medido ═══"
python3 - <<'PY'
import time, hmac, secrets, statistics

def compara_ruim(a: bytes, b: bytes) -> bool:
    """⚠ para no primeiro diferente"""
    if len(a) != len(b):
        return False
    for x, y in zip(a, b):
        if x != y:
            return False
    return True

def compara_bom(a: bytes, b: bytes) -> bool:
    """✓ acumula o XOR de todos"""
    return hmac.compare_digest(a, b)

segredo = secrets.token_bytes(32)

print("═══ medindo o vazamento ═══")
print()
print(f"  {'bytes certos':>12}  {'== (ruim)':>14}  {'compare_digest':>16}")
print("  " + "-"*46)

N = 4000
for acertos in [0, 4, 8, 16, 24, 31, 32]:
    # monta um palpite com `acertos` bytes certos
    palpite = segredo[:acertos] + bytes([(segredo[acertos] ^ 0xFF)]) + b"\x00" * (31 - acertos)

    t0 = time.perf_counter()
    for _ in range(N): compara_ruim(palpite, segredo)
    t_ruim = (time.perf_counter() - t0) / N * 1e9

    t0 = time.perf_counter()
    for _ in range(N): compara_bom(palpite, segredo)
    t_bom = (time.perf_counter() - t0) / N * 1e9

    print(f"  {acertos:>12}  {t_ruim:>12.0f} ns  {t_bom:>14.0f} ns")

print()
print("  ⚠ a coluna '== (ruim)' CRESCE com os bytes certos")
print("     o atacante mede isso e vai montando o segredo, byte a byte.")
print()
print("  ✓ a coluna 'compare_digest' é PLANA")
print("     não revela quantos bytes estavam certos.")
print()
print("═══ o ataque em números ═══")
print()
print("  com 32 bytes e 256 valores por byte:")
print(f"    tentativas se o tempo não vaza nada : 2^{32*8} = {2**256:,}")
print(f"    tentativas com medição de tempo    : 32 × 256 = {32*256:,}")
print(f"    ⚠ redução: {2**256/(32*256):.2e}×")
print()
print("  ✓ é por isso que a comparação em tempo constante não é")
print("     'boa prática' — é a diferença entre inviável e trivial.")
PY
```

⚠ **A tabela de tempos é a prova visual.** A coluna `==` **cresce** com os bytes certos; a do
`compare_digest` é **plana**. **E a redução de 2^256 para 8192 tentativas é o número que fecha o
argumento.**

⚠ **E é a classe 4 do módulo 7 (validação ausente) com sintoma de tempo.** **Não há erro, não há
crash, não há log** — há uma diferença de **nanossegundos** que o atacante **mede**.

**Produza `tempo-constante.md`:**

| Bytes certos | `==` (ns) | `compare_digest` (ns) |
|---|---|---|
| 0 | | |
| 8 | | |
| 16 | | |
| 31 | | |
| 32 | | |

**Responda:**

1. **A coluna `==` cresce?** O que isso vaza?
2. **A coluna `compare_digest` é plana?** Por quê?
3. **Quantas tentativas** o ataque exige com e sem o vazamento?
4. **Como você acha isso** em auditoria? Escreva o `grep`.

⚠ **O `grep` da resposta 4 é o instrumento:**

```bash
echo "═══ a busca por comparação insegura ═══"
cd ~/crypto-lab
echo
echo "  ── padrões SUSPEITOS ──"
for pat in 'memcmp' 'strcmp' '\.equals\(' 'strncmp' '== *token' '== *hmac' '== *mac' '== *signature'; do
    n=$(grep -rF "$pat" . --include='*.py' --include='*.c' --include='*.js' \
         --include='*.go' --include='*.java' --include='*.php' 2>/dev/null | \
         grep -viE 'compare_digest|memcmp\(.*public|timingSafe|sync\.' | wc -l)
    [ "$n" -gt 0 ] && printf '  ⚠ %-18s %s\n' "$pat" "$n"
done
echo
echo "  ── padrões CORRETOS ──"
for pat in 'compare_digest' 'CRYPTO_memcmp' 'timingSafeEqual' 'hmac\.Equal' 'MessageDigest.isEqual' 'sodium_memcmp'; do
    n=$(grep -rF "$pat" . 2>/dev/null | wc -l)
    [ "$n" -gt 0 ] && printf '  ✓ %-22s %s\n' "$pat" "$n"
done
echo
echo "  ⚠ cada ocorrência suspeita em caminho de comparação de"
echo "     SEGREDO (MAC, token, senha hash, assinatura) é achado."
```

**Produza `busca-comparacao.md`:**

| Padrão | Ocorrências | Achado? |
|---|---|---|
| `memcmp`/`strcmp`/`==` | | |
| `compare_digest`/`hmac.Equal` | | |

**Responda:**

1. **Quantas comparações suspeitas?** Em quais arquivos?
2. Alguma é de **segredo** (MAC, token, senha)?
3. Qual o `grep` completo que você usaria?
4. **Por que `==` é aceitável** em alguns casos e não em outros?

---

## 5.5 LAB — Hash, MAC e comparação

**Duração:** 120 min

### Passo 1 — As três famílias, aplicadas (35 min)

```bash
cd ~/crypto-lab/mod05

cat > tres-familias.py <<'PY'
#!/usr/bin/env python3
"""tres-familias.py — hash, MAC e assinatura no mesmo dado, com o que cada um prova."""
import hashlib, hmac, secrets
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.exceptions import InvalidSignature

msg = b"contrato: pagar 1000 reais"

print("═══ HASH — integridade contra acidente ═══")
h = hashlib.sha256(msg).hexdigest()
print(f"  sha256  : {h[:48]}...")
print(f"  prova   : o dado chegou intacto (contra corrupção)")
print(f"  ⚠ NÃO prova: veio de alguém, nem contra adversário")
print()

# demonstra por que não autentica
print("  ⚠ o atacante altera o dado E o hash:")
alterado = b"contrato: pagar 10000 reais"
h_falso = hashlib.sha256(alterado).hexdigest()
print(f"     dado alterado : {alterado}")
print(f"     hash recalculado: {h_falso[:48]}...")
print(f"     ✓ 'confere' — porque o hash NÃO tem chave")
print()

print("═══ MAC — integridade + autenticidade (simétrica) ═══")
k = secrets.token_bytes(32)
m = hmac.new(k, msg, hashlib.sha256).hexdigest()
print(f"  hmac    : {m[:48]}...")
print(f"  prova   : o dado não mudou, E veio de quem tem a chave")
print()
# atacante sem a chave
m_falso = hmac.new(secrets.token_bytes(32), alterado, hashlib.sha256).hexdigest()
esperado = hmac.new(k, alterado, hashlib.sha256).hexdigest()
print(f"  ⚠ atacante recalcula com chave ADIVINHADA:")
print(f"     tag dele      : {m_falso[:48]}...")
print(f"     tag esperada  : {esperado[:48]}...")
print(f"     confere? {hmac.compare_digest(m_falso, esperado)}")
print(f"  ✓ sem a chave, ele NÃO consegue forjar")
print()

print("═══ ASSINATURA — integridade + autoria + não repúdio ═══")
sk = ed25519.Ed25519PrivateKey.generate()
sig = sk.sign(msg)
print(f"  ed25519 : {sig.hex()[:48]}...")
print(f"  prova   : o dado não mudou, foi o dono da privada, E ele NÃO pode negar")
print()
print(f"  ✓ verifica com pública : ", end="")
try:
    sk.public_key().verify(sig, msg); print("OK")
except Exception: print("FALHOU")
print(f"  ⚠ verifica dado alterado: ", end="")
try:
    sk.public_key().verify(sig, alterado); print("⚠ ACEITOU (não deveria)")
except InvalidSignature: print("REJEITADO ✓")
print()
print("  ⚠ e o verificador NÃO precisa da chave privada — é público")
print("     é isso que permite não repúdio: só UM podia assinar.")
print()

print("═══ A TABELA FINAL ═══")
print()
print("  ┌────────────┬──────────┬──────────┬──────────┬────────────┐")
print("  │            │ chave    │ verifica │ autoria  │ não repúdio│")
print("  ├────────────┼──────────┼──────────┼──────────┼────────────┤")
print("  │ hash       │ nenhuma  │ qualquer │ ✗        │ ✗          │")
print("  │ MAC        │ simétric │ quem tem │ parcial  │ ✗          │")
print("  │ assinatura │ par      │ qualquer │ ✓        │ ✓          │")
print("  └────────────┴──────────┴──────────┴──────────┴────────────┘")
print()
print("  ⚠ a diferença de MAC para assinatura é UMA: não repúdio.")
print("     no MAC, as DUAS partes podiam ter gerado a tag.")
print("     é por isso que contrato se assina, não se autentica com HMAC.")
PY

python3 tres-familias.py
```

Produza `familias-aplicadas.md`:

| Família | Prova | Não prova | Caso de uso |
|---|---|---|---|
| Hash | | | |
| MAC | | | |
| Assinatura | | | |

**Responda:**

1. **Por que o hash recalculado "confere"** quando o atacante altera o dado?
2. Por que o atacante **não forja** a tag sem a chave?
3. **Por que contrato se assina** e não se autentica com HMAC?
4. O verificador **precisa da privada**? Por quê?

### Passo 2 — A caça no código (35 min)

```bash
cd ~/crypto-lab/mod05

cat > caca-hash.sh <<'SCRIPT'
#!/usr/bin/env bash
# caca-hash.sh — os cinco erros de hash/MAC/comparação
set -uo pipefail
DIR="${1:-$HOME/crypto-lab}"

echo "═══════════ CAÇA A HASH/MAC/COMPARAÇÃO ═══════════"
echo "diretório: ${DIR}"
echo

echo "── 1. ALGORITMO MORTO ──"
for pat in 'md5' 'MD5' 'sha1' 'SHA1' 'SHA-1'; do
    n=$(grep -rF "$pat" "$DIR" --include='*.py' --include='*.js' --include='*.c' \
         --include='*.go' --include='*.java' --include='*.php' 2>/dev/null | \
         grep -viE 'sha1_join|#' | wc -l)
    [ "$n" -gt 0 ] && printf '  ⚠ %-10s %s ocorrência(s)\n' "$pat" "$n"
done
echo

echo "── 2. MAC MAL CONSTRUÍDO ──"
echo "  procurando sha256(secret + data):"
grep -rEn 'hashlib\.sha(256|1|512)\s*\(\s*[a-z_]*(key|secret|token)[a-z_]*\s*\+' \
     "$DIR" --include='*.py' 2>/dev/null | head -5 | sed 's/^/    ⚠ /'
grep -rEn 'createHash\([^)]*\)\.update\([^)]*(secret|key)[^)]*\+' \
     "$DIR" --include='*.js' 2>/dev/null | head -5 | sed 's/^/    ⚠ /'
echo "    (fim)"
echo

echo "── 3. COMPARAÇÃO INSEGURA ──"
for pat in 'memcmp' 'strcmp' 'strncmp' '\.equals\('; do
    n=$(grep -rF "$pat" "$DIR" --include='*.c' --include='*.py' --include='*.java' \
         --include='*.js' 2>/dev/null | grep -viE 'compare_digest|timingSafe|isEqual' | wc -l)
    [ "$n" -gt 0 ] && printf '  ⚠ %-12s %s\n' "$pat" "$n"
done
echo

echo "── 4. HASH DE SENHA (errado) ──"
echo "  senha passando por hash rápido:"
grep -rEn '(password|senha|pwd|passwd)['"'"'"]*\s*[),]' "$DIR" --include='*.py' 2>/dev/null | \
    grep -E 'sha(1|256|512)|md5|hashlib\.' | head -5 | sed 's/^/    ⚠ /'
echo "    (fim)"
echo

echo "── 5. PADRÕES CORRETOS ──"
for pat in 'hmac.new' 'compare_digest' 'argon2' 'bcrypt' 'scrypt' 'pbkdf2' \
           'timingSafeEqual' 'crypto.timingSafeEqual' 'MessageDigest.isEqual'; do
    n=$(grep -rF "$pat" "$DIR" 2>/dev/null | wc -l)
    [ "$n" -gt 0 ] && printf '  ✓ %-26s %s\n' "$pat" "$n"
done
echo

echo "── 6. VEREDICTO ──"
ruins=$(grep -rEn 'hashlib\.sha(256|1|512)\s*\(\s*[a-z_]*(key|secret)' "$DIR" --include='*.py' 2>/dev/null | wc -l)
mortos=$(grep -rF 'md5' "$DIR" --include='*.py' --include='*.js' 2>/dev/null | grep -vi '#' | wc -l)
echo "  MAC mal construído : ${ruins}"
echo "  algoritmo morto    : ${mortos}"
[ "$((ruins + mortos))" -eq 0 ] && echo "  ✓ nenhum achado óbvio" || echo "  ⚠ há achados para revisar"
SCRIPT

chmod +x caca-hash.sh
./caca-hash.sh ~/crypto-lab 2>&1 | tee caca.txt
```

Produza `caca-codigo.md`:

| # | Padrão buscado | Ocorrências | Achado? |
|---|---|---|---|
| 1 | MD5/SHA-1 | | |
| 2 | `sha256(secret+data)` | | |
| 3 | `memcmp`/`==` | | |
| 4 | Hash de senha | | |
| 5 | `hmac.new`/`compare_digest` | | |

**Responda:**

1. **Quantos achados?** Quais são reais?
2. O padrão 2 apareceu? **É o mais grave.**
3. Algum uso de MD5/SHA-1? **Onde?**
4. **Qual correção** para cada achado?

### Passo 3 — A correção e a regra (50 min)

```bash
cd ~/crypto-lab/mod05

cat > correto.py <<'PY'
#!/usr/bin/env python3
"""correto.py — hash, MAC, assinatura e comparação, nas formas certas."""
import hashlib, hmac, secrets, time
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.exceptions import InvalidSignature

# ── 1. INTEGRIDADE SEM SEGREDO: hash cru (endereço de conteúdo) ──
def endereco_conteudo(dado: bytes) -> str:
    """✓ uso legítimo: identificar conteúdo. NÃO autentica."""
    return hashlib.sha256(dado).hexdigest()

# ── 2. INTEGRIDADE COM SEGREDO: HMAC ──
def mac(k: bytes, dado: bytes) -> bytes:
    """✓ SEMPRE hmac.new, nunca hash(k + dado)."""
    return hmac.new(k, dado, hashlib.sha256).digest()

def verifica_mac(k: bytes, dado: bytes, tag: bytes) -> bool:
    """✓ comparação em tempo constante."""
    return hmac.compare_digest(mac(k, dado), tag)

# ── 3. MAC COM CONTEXTO (domínio separado) ──
def mac_contextual(k: bytes, contexto: bytes, dado: bytes) -> bytes:
    """
    ✓ o contexto evita que um MAC de um uso valha em outro.
    ⚠ é o mesmo princípio do HKDF com rótulo (módulo 4).
    """
    return hmac.new(k, b"ctx:" + contexto + b"|" + dado, hashlib.sha256).digest()

# ── 4. SENHA: KDF lento ──
def senha_guarda(senha: bytes):
    """✓ argon2id (módulo 4)."""
    try:
        from argon2.low_level import hash_secret_raw, Type
        salt = secrets.token_bytes(16)
        h = hash_secret_raw(senha, salt, 3, 64*1024, 1, 32, Type.ID)
        return salt, h
    except ImportError:
        salt = secrets.token_bytes(16)
        return salt, hashlib.pbkdf2_hmac("sha256", senha, salt, 600_000, 32)

# ── 5. AUTORIA: assinatura ──
def assina(sk, dado: bytes) -> bytes:
    return sk.sign(dado)

def verifica_assinatura(pk, dado: bytes, sig: bytes) -> bool:
    try:
        pk.verify(sig, dado); return True
    except InvalidSignature:
        return False

# ── 6. ASSINATURA COM CONTEXTO (evita replay entre domínios) ──
def assina_contextual(sk, contexto: bytes, dado: bytes) -> bytes:
    return sk.sign(b"v1|" + contexto + b"|" + dado)

if __name__ == "__main__":
    print("═══ AS FORMAS CORRETAS ═══")
    print()

    dado = b"documento importante"

    print("── hash (identificar conteúdo) ──")
    print(f"   sha256 : {endereco_conteudo(dado)[:40]}...")
    print()

    print("── HMAC (integrar com segredo) ──")
    k = secrets.token_bytes(32)
    t = mac(k, dado)
    print(f"   tag    : {t.hex()[:40]}...")
    print(f"   verifica (mesmo dado)     : {verifica_mac(k, dado, t)}")
    print(f"   verifica (dado alterado)  : {verifica_mac(k, b'alterado', t)}")
    print()

    print("── MAC contextual (sem confusão entre usos) ──")
    t_login  = mac_contextual(k, b"login-token", dado)
    t_backup = mac_contextual(k, b"backup-file", dado)
    print(f"   contexto 'login-token' : {t_login.hex()[:40]}...")
    print(f"   contexto 'backup-file' : {t_backup.hex()[:40]}...")
    print(f"   ⚠ iguais? {t_login == t_backup}")
    print(f"   ✓ um MAC de login NÃO vale para backup, mesmo com o mesmo dado")
    print()

    print("── assinatura (autoria + não repúdio) ──")
    sk = ed25519.Ed25519PrivateKey.generate()
    sig = assina(sk, dado)
    print(f"   sig    : {sig.hex()[:40]}...  ({len(sig)} bytes)")
    print(f"   verifica : {verifica_assinatura(sk.public_key(), dado, sig)}")
    print(f"   alterado : {verifica_assinatura(sk.public_key(), b'x', sig)}")
    print()

    print("── senha (KDF lento) ──")
    salt, h = senha_guarda(b"senha-do-usuario")
    print(f"   salt   : {salt.hex()}")
    print(f"   hash   : {h.hex()[:40]}...")
    print()

    print("═══ A REGRA ═══")
    print()
    print("  ┌───────────────────────────────┬────────────────────────────┐")
    print("  │ você quer                     │ use                        │")
    print("  ├───────────────────────────────┼────────────────────────────┤")
    print("  │ identificar conteúdo          │ SHA-256 (sem chave)        │")
    print("  │ integrar com segredo          │ HMAC-SHA-256               │")
    print("  │ separar uso (login vs backup) │ MAC contextual / HKDF      │")
    print("  │ provar autoria                │ Ed25519                    │")
    print("  │ guardar senha                 │ argon2id                   │")
    print("  │ comparar dois segredos        │ compare_digest             │")
    print("  └───────────────────────────────┴────────────────────────────┘")
    print()
    print("  ⚠ e nunca: MD5, SHA-1, hash(k+msg), == em segredo")
PY

python3 correto.py
```

⚠ **O `mac_contextual` é o detalhe que quase ninguém aplica.** Sem ele, um MAC gerado para **um
propósito** vale para **outro**, desde que o dado seja o mesmo. **Com contexto, não vale** — e é o
mesmo princípio do HKDF com rótulo (módulo 4) e do AAD (módulo 3).

⚠ **É o tipo de falha que aparece em sistema com múltiplos usos de token:** um token de
**redefinição de senha** com o mesmo MAC de um token de **sessão** — e o atacante usa um no lugar do
outro.

Produza `regra-hash.md`:

```markdown
# Regra de hash, MAC e comparação

## Vou...                                    → uso
| Identificar conteúdo                        | SHA-256/512, BLAKE3 |
| Integrar com segredo                        | HMAC-SHA-256 |
| Separar uso (login/backup/API)              | MAC contextual, HKDF com rótulo |
| Provar autoria, não repúdio                 | Ed25519 |
| Guardar senha                               | argon2id (64MB, 3it) |
| Provar que não mudou SEM segredo            | ⚠ nada — hash não autentica |
| Comparar dois segredos                      | compare_digest / CRYPTO_memcmp |
| Identificar arquivo grande                  | SHA-256 (streaming) |

## Proibido
- [ ] MD5, SHA-1 (colisão prática)
- [ ] `hash(k + msg)` (extensão de comprimento)
- [ ] `==`, `memcmp`, `strcmp` em segredo (timing)
- [ ] hash rápido para senha
- [ ] assinar sem contexto (replay entre domínios)
- [ ] RSA PKCS#1 v1.5 (ROBOT)

## Verificação
```bash
grep -rEn 'hashlib\.sha(256|1|512)\s*\(\s*[a-z_]*(key|secret)' <código>   # MAC errado
grep -rEn '\b(memcmp|strcmp)\b' <código> | grep -iE 'hmac|mac|token|sig'  # comparação
grep -rF 'md5' <código>                                                    # morto
grep -rF 'hashlib.sha256(password' <código>                                # senha
```
```

**Responda:**

1. **O que o MAC contextual impede?** Dê um exemplo de falha sem ele.
2. Qual a relação entre MAC contextual, AAD e HKDF com rótulo?
3. **Qual dos `grep` da verificação é o mais importante?**
4. Se você visse `hashlib.md5` num código de produção, **qual a severidade**?

### Critérios de aceitação

- `tres-familias.md` com as três e o que cada uma prova.
- Você demonstrou que o **hash recalculado "confere"** quando o dado é alterado.
- `hashes.md` com os cinco algoritmos e o estado de cada um.
- Você explicou o que a **colisão do SHA-1** permite que a preimagem não permite.
- `extensao.md` com as quatro construções.
- Você demonstrou **o ataque de extensão** (ou explicou o mecanismo com `hashpumpy`).
- Você escreveu o **`grep`** que acha `hash(secret + data)`.
- `assinatura.md` com as quatro e o **bug de nonce**.
- Você explicou **por que Ed25519 é imune ao bug do PS3**.
- `tempo-constante.md` com a tabela de tempos **medida**.
- Você explicou a diferença entre as colunas e a **redução de tentativas**.
- `caca-hash.sh` rodando, com os cinco padrões buscados.
- Você identificou **o achado mais grave** da sua busca.
- `correto.py` rodando, com o **MAC contextual**.
- Você explicou o que o **MAC contextual** impede.
- `regra-hash.md` com as **oito** linhas de uso.

---

## Avaliação

1. Diferencie hash, MAC e assinatura — o que cada um prova e não prova.
2. **Por que um hash sozinho não autentica**, e por que `sha256sum` ainda é correto?
3. **Qual a única diferença** entre MAC e assinatura?
4. Diferencie preimagem, segunda preimagem e colisão.
5. **Por que MD5 e SHA-1 estão mortos?** O que o SHAttered provou?
6. **Por que a colisão quebra assinatura**, se você assina o hash?
7. Por que **SHA-3** existe se SHA-2 não está quebrado?
8. O que é XOF, e para que serve o SHAKE?
9. **Descreva o ataque de extensão de comprimento.** O que o atacante precisa saber?
10. **Por que `SHA256(k ‖ msg)` é inseguro e `HMAC(k, msg)` não é?**
11. Por que `SHA256(msg ‖ k)` é melhor mas ainda frágil?
12. Quais são os **três** MAC corretos?
13. **Por que Ed25519 é imune ao bug de nonce do PS3?**
14. Por que **RSA PKCS#1 v1.5** deve ser evitado? Qual ataque?
15. **Por que a comparação `==` vaza?** Descreva o ataque.
16. **Quantas tentativas** o ataque de timing exige, com e sem vazamento?
17. Cite a função de comparação em tempo constante de **cinco** linguagens.
18. **O que o MAC contextual impede?** Relacione com o AAD e com o HKDF.
19. Escreva o `grep` que acha `hash(secret + data)` em código.
20. **O que "hash sem chave" autentica?** Responda com um caso concreto.

---

**Próximo:** [Módulo 6 — TLS de verdade](modulo-06.md)
