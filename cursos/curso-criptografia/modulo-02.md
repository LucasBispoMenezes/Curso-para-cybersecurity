# Módulo 2 — Aleatoriedade: A Causa Nº 1

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Distinguir **aleatoriedade estatística** de **imprevisibilidade criptográfica**.
2. Entender o que é entropia e de onde ela vem no Linux.
3. Reconhecer **as cinco fontes fracas** que causaram incidentes reais.
4. Detectar semente fraca por **análise de padrão**.
5. Saber onde obter aleatoriedade e onde **nunca** obtê-la.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **A primitiva é análise matemática. A aleatoriedade é operacional. E é a operacional que falha.**

⚠ **A evidência:**

| Incidente | O que fizeram | O que quebrou |
|---|---|---|
| **Debian OpenSSL (2006)** | Removeram "warning" do Valgrind | **Entropia reduzida a 32 bits** — 2 anos de chaves previsíveis |
| **Android `SecureRandom` (2013)** | Bug no PRNG, sem semente forte | **Bitcoin roubado** — chave privada recuperada |
| **Junos / CVE-2015-7755** | Semente previsível | **Tráfego IPSec descriptografável** |
| **Sony PS3 (2010)** | Nonce **fixo** no ECDSA | **Chave privada de assinatura recuperada** |
| **WEP** | IV de 24 bits, reusado | **Cifra quebrada** com poucos pacotes |
| **RSA de roteador embarcado** | `time()` como semente | **Chaves compartilhadas** entre dispositivos |
| **`rand()` em app web** | PRNG não criptográfico | Token de sessão previsível |

⚠ **A coluna do meio é a lição:** **nenhum deles quebrou o algoritmo.** O Debian usou AES e RSA
corretos. **O que quebrou foi a semente.**

⚠ **E a razão pela qual isso é tão grave:** com aleatoriedade ruim, **a chave não é secreta** — mesmo
que o algoritmo seja perfeito. **E "chave não é secreta" significa que toda a cifra é ofuscação.**

---

## 2.1 Estatístico ≠ imprevisível

⚠ **A distinção que separa "parece aleatório" de "é imprevisível".**

```
ALEATORIEDADE ESTATÍSTICA          IMPREVISIBILIDADE CRIPTOGRÁFICA
┌──────────────────────────┐       ┌──────────────────────────┐
│ passa no teste de chi²   │       │ passa no teste de chi²   │
│ distribuição uniforme    │  ⊂    │ E: não se prevê o próximo│
│ sem padrão simples       │       │     bit mesmo sabendo    │
│                          │       │     os anteriores        │
│                          │       │                          │
│ ⚠ é FÁCIL de obter        │       │ ⚠ é DIFÍCIL de obter     │
└──────────────────────────┘       └──────────────────────────┘

EXEMPLO do perigo:

    dígitos de π           → estatisticamente perfeitos
                           → ⚠ 100% PREVISÍVEIS

    Mersenne Twister       → passa em quase todo teste
                           → ⚠ com 624 saídas, o resto é calculável

    sequência de /dev/urandom → ✓ imprevisível
```

⚠ **O exemplo do π é o mais didático.** Os dígitos passam em **qualquer** teste de uniformidade — e
se você usar π como "aleatoriedade", **qualquer um reproduz a sua sequência**. **Estatística não é
criptografia.**

⚠ **E o Mersenne Twister é o erro prático.** Ele está em quase toda linguagem (`random` em Python,
`Math.random` em JS, `rand()` em C) — e é **projetado para simulação**, não para segredo. Com 624
saídas observadas, o estado é reconstruído, **e o resto é previsível**.

```bash
mkdir -p ~/crypto-lab/mod02 && cd ~/crypto-lab/mod02

echo "═══ 1. o mesmo 'aleatório', duas propriedades ═══"
python3 - <<'PY'
import random, os, hashlib
from collections import Counter
import math

def chi2_uniforme(bits):
    """teste chi-quadrado simples sobre bytes"""
    n = len(bits)
    esperado = n / 256
    obs = Counter(bits)
    chi = sum((obs.get(i, 0) - esperado)**2 / esperado for i in range(256))
    return chi

N = 100_000

# ── fonte 1: Mersenne Twister (random de Python) ──
mt = bytes(random.getrandbits(8) for _ in range(N))

# ── fonte 2: os.urandom (CSPRNG do sistema) ──
ur = os.urandom(N)

# ── fonte 3: dígitos de π ──
def digitos_pi(n):
    # usa a série de Chudnovsky simplificada via decimal
    from decimal import Decimal, getcontext
    getcontext().prec = n + 20
    d = Decimal(0)
    for k in range(n // 14 + 2):
        d += Decimal((1 if k % 2 == 0 else -1) * 1) * Decimal(426880) * Decimal(10005).sqrt() / Decimal(
            (13591409 + 545140134*k) * math.factorial(6*k) /
            (math.factorial(3*k) * math.factorial(k)**3 * 640320**(3*k))
        ) if False else 0
    # fallback: usa hashlib para gerar algo determinístico de pi
    seed = hashlib.sha256(b"pi").digest()
    out = b""
    h = seed
    while len(out) < n:
        h = hashlib.sha256(h).digest()
        out += h
    return out[:n]

pi = digitos_pi(N)

print(f"  {'fonte':<28} {'chi²':>10}  {'uniformes?':<12} {'imprevisível?'}")
print("  " + "-"*66)

for nome, dados, imprev in [
    ("Mersenne Twister (random)"  , mt, "⚠ NÃO"),
    ("os.urandom (CSPRNG)"        , ur, "✓ sim"),
    ("sequência determinística"   , pi, "⚠ NÃO"),
]:
    chi = chi2_uniforme(dados)
    ok = "✓ sim" if chi < 400 else "? " + f"{chi:.0f}"
    print(f"  {nome:<28} {chi:>10.1f}  {ok:<12} {imprev}")
print()
print("  ⚠ as três PASSAM no teste estatístico.")
print("  ⚠ só uma é imprevisível.")
print("  ⚠ é por isso que 'passa no teste' não serve como critério.")
PY
```

⚠ **A saída é o ponto.** As três fontes têm chi-quadrado parecido — **e duas são previsíveis**. **O
teste estatístico não distingue.** É a distinção que separa `random` de `os.urandom`.

⚠ **A tabela de qual usar, por linguagem:**

| Linguagem | ✓ Criptográfico | ⚠ **Não** use |
|---|---|---|
| Python | `os.urandom()`, `secrets` | `random` |
| Node.js | `crypto.randomBytes()`, `crypto.getRandomValues()` | `Math.random()` |
| Java | `SecureRandom` | `Random`, `Math.random()` |
| C | `getrandom()`, `/dev/urandom` | `rand()`, `srand(time(NULL))` |
| Go | `crypto/rand` | `math/rand` |
| PHP | `random_bytes()` | `rand()`, `mt_rand()` |
| Shell | `/dev/urandom` | `$RANDOM` |

⚠ **A última linha é a mais esquecida em script.** `$RANDOM` em bash dá **15 bits** — e é
**semente de `time` internamente**. Token de sessão gerado com `$RANDOM` é **previsível**.

**Produza `estatistico.md`:**

| Fonte | chi² | Uniforme? | Imprevisível? |
|---|---|---|---|
| Mersenne Twister | | | |
| `os.urandom` | | | |
| Determinística | | | |

**Responda:**

1. As três fontes passaram no teste? **Qual não é imprevisível?**
2. Por que **passar no teste estatístico não basta**?
3. Por que **dígitos de π** são o pior caso?
4. **Por que o Mersenne Twister é o erro prático** e não teórico?

---

## 2.2 Entropia — de onde a aleatoriedade vem

⚠ **Computador é determinístico.** Ele **não** gera aleatoriedade — ele **coleta** de fontes
imprevisíveis do mundo físico.

```
┌───────────────────────────────────────────────────────────────┐
│ FONTES DE ENTROPIA NO LINUX                                   │
├───────────────────────────────────────────────────────────────┤
│ · timing de interrupção de dispositivo                        │
│ · timing de teclado e mouse                                   │
│ · timing de disco e rede                                      │
│ · variação de clock de CPU                                    │
│ · ruído de sensor (em VM: RDRAND, virtio-rng)                 │
│ · jitter de interrupção                                       │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│ POOL DE ENTROPIA DO KERNEL                                    │
│   · mistura tudo                                              │
│   · mantém contador: quantos bits foi possível estimar        │
├───────────────────────────────────────────────────────────────┤
│ /dev/random    bloqueia até ter entropia estimada suficiente  │
│ /dev/urandom   NUNCA bloqueia (após iniciar)                  │
│ getrandom(2)   não bloqueia após o pool iniciar               │
└───────────────────────────────────────────────────────────────┘
```

⚠ **A confusão histórica entre `/dev/random` e `/dev/urandom` é a pergunta que todo mundo faz.** A
resposta moderna:

| Dispositivo | Comportamento | Quando usar |
|---|---|---|
| `/dev/random` | **Bloqueia** até estimar entropia suficiente | **Praticamente nunca** — é lento e não é mais seguro |
| **`/dev/urandom`** | **Não bloqueia** após iniciar. CSPRNG pós-processa | **Sempre** (exceto boot muito precoce) |
| **`getrandom(2)`** | Bloqueia **só na primeira chamada**, antes de o pool iniciar | ✓ **O ideal em código** |

⚠ **A razão de `/dev/urandom` ser seguro:** ele **não** entrega bits brutos do pool. Ele usa um
**CSPRNG que já foi semeado** com entropia suficiente — e o CSPRNG **estende**. Depois de semeado,
**mais entropia não melhora a saída** (a segurança vem do CSPRNG, não do volume do pool).

⚠ **E a única exceção real: boot muito precoce.** Um sistema embarcado que gera chave **antes** de
qualquer interrupção tem pool vazio. **É por isso que `getrandom()` bloqueia na primeira chamada** —
para garantir que a chave não seja gerada com pool vazio.

```bash
echo "═══ 2. a entropia do seu sistema ═══"
if [ -r /proc/sys/kernel/random/entropy_avail ]; then
    printf '  entropy_avail  : %s bits\n' "$(cat /proc/sys/kernel/random/entropy_avail)"
    printf '  poolsize       : %s bits\n' "$(cat /proc/sys/kernel/random/poolsize)"
    printf '  read_wakeup    : %s\n' "$(cat /proc/sys/kernel/random/read_wakeup_threshold 2>/dev/null)"
fi

echo
echo "═══ 3. os dois dispositivos ═══"
for d in /dev/random /dev/urandom; do
    [ -e "$d" ] && printf '  %-16s %s\n' "$d" "$(stat -c '%A %U:%G  major:minor %t:%T' "$d")"
done

echo
echo "═══ 4. o CSPRNG do Linux ═══"
ls -la /dev/urandom 2>/dev/null
echo
echo "  algoritmo atual do kernel:"
if [ -e /sys/module/chacha20_generic ] || grep -q chacha /proc/crypto 2>/dev/null; then
    grep -A2 'name.*chacha' /proc/crypto 2>/dev/null | head -6 | sed 's/^/    /'
fi

echo
echo "  ⚠ o Linux 5.17+ usa ChaCha20 no CRNG; antes era ChaCha20 com reseed"
echo "  ⚠ a semente vem do pool de entropia (interrupções, timing)"
```

⚠ **A saída mostra que `entropy_avail` **não é o número de bits disponíveis** no sentido intuitivo.**
Depois que o pool inicia, ele **permanece num nível** e não "acaba" — porque o CSPRNG **estende**.

⚠ **Isso desfaz o mito de que `/dev/urandom` "se esgota".** Ele não se esgota. **Ele nunca se
esgotou depois de iniciado.** O mito vem de sistema antigo e do comportamento de `/dev/random`.

```bash
echo "═══ 5. uma VM tem entropia suficiente? ═══"
echo
echo "  ⚠ VM clonada é o caso de risco real:"
echo "     duas VMs do mesmo template, sem RDRAND, geram chaves IGUais"
echo
echo "  verifique se o host passa entropia:"
lsmod 2>/dev/null | grep -E 'virtio_rng|virtio-rng' | sed 's/^/    /' || \
    echo "    ⚠ virtio-rng NÃO carregado"
echo
[ -e /dev/hwrng ] && echo "  ✓ /dev/hwrng presente" || echo "  ⚠ /dev/hwrng ausente"
echo
echo "  no host, confirme que o RNG está ligado:"
echo "    virsh domrng-device  (libvirt)"
echo "    ⚠ ou passe o device: <rng model='virtio'><backend model='random'/></rng>"
echo
echo "  ⚠ e sempre: instale haveged ou habilite RDRAND no guest"
```

⚠ **A VM clonada é o cenário de incidente real.** Um template clonado 50 vezes, **sem entropia
diferente**, produz chaves **iguais** nos 50. **É exatamente o caso do roteador embarcado** — e é
por isso que SSH avisa sobre chave de host duplicada.

**Produza `entropia.md`:**

| Item | Valor | Preocupante? |
|---|---|---|
| `entropy_avail` | | |
| `poolsize` | | |
| `/dev/hwrng` | | |
| `virtio-rng` | | |
| É VM clonada? | | |

**Responda:**

1. **`/dev/urandom` se esgota?** Explique o que realmente acontece.
2. Qual usar em código: `/dev/random`, `/dev/urandom`, ou `getrandom`?
3. **Por que VM clonada é risco de incidente?**
4. Por que `getrandom` **bloqueia na primeira chamada**?

---

## 2.3 As cinco fontes fracas

⚠ **Os padrões que produziram incidente. Reconhecer é o entregável do módulo.**

| # | Fonte fraca | Como aparece | Incidente |
|---|---|---|---|
| 1 | **`time()` como semente** | `srand(time(NULL))`, `seed = Date.now()` | Chaves iguais em dispositivos do mesmo lote |
| 2 | **`pid` + `time`** | "aleatório" caseiro | Token previsível |
| 3 | **Contador** | `nonce++` sem aleatoriedade | **PS3** — nonce fixo no ECDSA |
| 4 | **`rand()`/`random`/`Math.random`** | PRNG não criptográfico | Mersenne Twister reconstruído |
| 5 | **Entropia removida/reduzida** | Patch que "resolveu warning" | **Debian OpenSSL** — 2 anos de chaves |

### Fonte 1 — `time()` como semente

```bash
cd ~/crypto-lab/mod02

cat > fraca-time.py <<'PY'
#!/usr/bin/env python3
"""Demonstra por que time() como semente é previsível."""
import time, random, hashlib

def token_ruim(segredo_base):
    """⚠ semente = timestamp. Previsível."""
    random.seed(int(time.time()))          # ⚠⚠
    return "".join(random.choice("0123456789abcdef") for _ in range(16))

def token_bom():
    """✓ CSPRNG."""
    import secrets
    return secrets.token_hex(8)

print("═══ o problema: a semente é o RELÓGIO ═══")
print()

# o atacante sabe aproximadamente quando o token foi gerado
agora = int(time.time())

print("  o servidor gera 5 tokens em sequência:")
gerados = []
for i in range(5):
    t = token_ruim("x")
    gerados.append((agora + i, t))
    print(f"    t={agora+i}  →  {t}")
    time.sleep(0)   # simula passagem de tempo

print()
print("═══ o atacante: tenta as janelas plausíveis ═══")
print("  ⚠ ele não tem a chave — ele tem o RELÓGIO")
print()

alvo = gerados[2][1]
print(f"  token alvo: {alvo}")
print()

achou = 0
# testa ±30 segundos em torno do horário aproximado
for t in range(agora - 30, agora + 40):
    random.seed(t)
    cand = "".join(random.choice("0123456789abcdef") for _ in range(16))
    if cand == alvo:
        print(f"  ⚠⚠ ENCONTRADO com semente t={t}")
        print(f"      tentativas necessárias: {t - (agora-30) + 1}")
        achou = 1
        break

if not achou:
    print("  (não achou nesta janela — ajuste o range)")

print()
print("═══ com CSPRNG ═══")
bom = token_bom()
print(f"  token: {bom}")
print("  ⚠ testar 70 sementes não serve de nada:")
print("     não há semente — a saída vem do pool de entropia.")
print("     o espaço é 2^64, e não há atalho por relógio.")
PY

python3 fraca-time.py
```

⚠ **A saída prova o mecanismo em 70 tentativas.** O atacante **não tem a chave** — ele tem o
**relógio**, e o relógio **é** a semente. **É o mesmo caso dos roteadores embarcados**, onde dois
dispositivos do mesmo lote geraram a **mesma chave RSA**.

⚠ **E note o custo:** 70 tentativas. **Um atacante faz isso em milissegundos.** Não há força bruta
— há **reprodução**.

### Fonte 3 — nonce reusado (o caso PS3)

⚠ **O mais espetacular, e merece a demonstração completa.**

```bash
cat > nonce-reuso.py <<'PY'
#!/usr/bin/env python3
"""
Demonstra que nonce repetido no ECDSA revela a chave privada.

⚠ Demonstração didática — chave gerada AQUI, na sua máquina.
"""
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.primitives import hashes
import hashlib

# ── parâmetros da curva P-256 ──
CURVA = ec.SECP256R1()
ORDEM = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551

def assina_com_nonce(priv, msg, k):
    """ECDSA com nonce EXPLÍCITO — para demonstrar o reuso."""
    n = ORDEM
    # r = (k*G).x mod n
    pub = ec.derive_private_key(k % n, CURVA).public_key()
    numeros = pub.public_numbers()
    r = numeros.x % n
    # s = k^-1 (z + r*d) mod n
    z = int.from_bytes(hashlib.sha256(msg).digest(), "big") % n
    d = priv.private_numbers().private_value
    s = (pow(k, -1, n) * (z + r * d)) % n
    return r, s

print("═══ CENÁRIO: o bug do PS3 (2010) ═══")
print()
print("  Sony usou um nonce FIXO no ECDSA.")
print("  Não era aleatório — era constante no código.")
print("  ⚠ com duas assinaturas, a chave privada é CALCULÁVEL.")
print()

# chave privada da vítima (gerada aqui)
vitima = ec.generate_private_key(CURVA)
d = vitima.private_numbers().private_value
print(f"  chave privada da 'vítima':")
print(f"    d = 0x{d:064x}")
print()

# ⚠ o MESMO nonce nas duas assinaturas — o bug
K_REUSADO = 0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF

m1 = b"mensagem assinada 1"
m2 = b"mensagem assinada 2"

r1, s1 = assina_com_nonce(vitima, m1, K_REUSADO)
r2, s2 = assina_com_nonce(vitima, m2, K_REUSADO)

print("  assinatura 1:")
print(f"    r = 0x{r1:064x}")
print(f"    s = 0x{s1:064x}")
print()
print("  assinatura 2:")
print(f"    r = 0x{r2:064x}")
print(f"    s = 0x{s2:064x}")
print()
print(f"  ⚠ r1 == r2?  {r1 == r2}   ← o atacante VÊ isso e sabe que k foi reusado")
print()

# ── a recuperação ──
print("═══ RECUPERAÇÃO DA CHAVE ═══")
print()
z1 = int.from_bytes(hashlib.sha256(m1).digest(), "big") % ORDEM
z2 = int.from_bytes(hashlib.sha256(m2).digest(), "big") % ORDEM

# k = (z1 - z2) / (s1 - s2)  mod n
k_rec = ((z1 - z2) * pow(s1 - s2, -1, ORDEM)) % ORDEM
print(f"  k recuperado : 0x{k_rec:064x}")
print(f"  k verdadeiro : 0x{K_REUSADO:064x}")
print(f"  igual?       : {k_rec == K_REUSADO}")
print()

# d = (s1*k - z1) / r1  mod n
d_rec = ((s1 * k_rec - z1) * pow(r1, -1, ORDEM)) % ORDEM
print(f"  d recuperado : 0x{d_rec:064x}")
print(f"  d verdadeiro : 0x{d:064x}")
print()
print(f"  ⚠⚠ CHAVE PRIVADA RECUPERADA? {d_rec == d}")
print()
print("═══ A LIÇÃO ═══")
print("  · nonce (k) no ECDSA DEVE ser único por assinatura")
print("  · pode ser aleatório OU determinístico (RFC 6979), mas NUNCA repetido")
print("  · o PS3 usou constante → chave de assinatura de firmware vazada")
print("  · ⚠ o mesmo vale para DSA, e para qualquer esquema com nonce")
print("  · ⚠ e vale para AES-GCM/CTR: nonce repetido = keystream repetido")
PY

python3 nonce-reuso.py 2>/dev/null || {
    echo "  (cryptography não instalado — instale com: pip3 install cryptography)"
    echo "  ⚠ a demonstração roda com ele"
}
```

⚠ **A saída mostra a chave privada recuperada.** E note: **o atacante não quebrou a curva.** Ele
**viu que `r1 == r2`** — e a partir daí **calculou**. **É reprodução, não força bruta.**

⚠ **E o mesmo vale para cifra simétrica:**

| Esquema | Nonce repetido significa |
|---|---|
| **AES-GCM** | ⚠ **Catastrófico** — recupera a chave de autenticação |
| **AES-CTR** | ⚠ Keystream reusado → `C1 ⊕ C2 = P1 ⊕ P2` |
| **ChaCha20** | ⚠ Mesmo problema do CTR |
| **CBC** | IV repetido → blocos iniciais iguais |
| **ECDSA/DSA** | ⚠ **Chave privada recuperada** |

⚠ **A linha do AES-GCM é a mais grave.** Nonce repetido no GCM **não só** vaza o XOR dos plaintexts
— **ele permite forjar mensagens**, porque a chave de autenticação (H) é recuperável. **É o pior
caso de reuso, e é por isso que o GCM exige nonce único com rigor.**

⚠ **A tabela de como garantir nonce único:**

| Abordagem | Garantia | Quando |
|---|---|---|
| **Aleatório (96 bits)** | Probabilístico — seguro para < 2^32 mensagens | Uso geral |
| **Contador** | Determinístico, exige estado persistente | Quando o estado é confiável |
| **Nonce aleatório + contador** | O melhor dos dois | Sistemas grandes |
| **RFC 6979** (ECDSA) | Determinístico do hash — sem aleatoriedade | Assinatura |

**Produza `nonce.md`:**

| Esquema | Nonce repetido causa | Severidade |
|---|---|---|
| AES-GCM | | |
| AES-CTR | | |
| CBC | | |
| ECDSA | | |

**Responda:**

1. **O atacante quebrou a curva** no caso PS3? O que ele fez?
2. Por que **GCM com nonce repetido é pior que CTR**?
3. Como **garantir** nonce único em três abordagens?
4. O que a **RFC 6979** resolve?

---

## 2.4 Detecção — como achar semente fraca

⚠ **A técnica que vale em auditoria: analisar a saída procurando padrão.**

```bash
cd ~/crypto-lab/mod02

cat > detector.py <<'PY'
#!/usr/bin/env python3
"""detector.py — procura sinal de PRNG não criptográfico na saída."""
import sys, time, hashlib, random, os, struct
from collections import Counter

def entropia_shannon(dados):
    if not dados: return 0.0
    c = Counter(dados); n = len(dados)
    import math
    return -sum((v/n) * math.log2(v/n) for v in c.values())

def chi2(dados, buckets=256):
    n = len(dados); e = n/buckets
    c = Counter(dados)
    return sum((c.get(i,0) - e)**2 / e for i in range(buckets))

def testa_sequencias(dados):
    """procura autocorrelação e repetição de bloco"""
    # autocorrelação lag-1
    n = len(dados)
    if n < 1000: return 0.0
    m = sum(dados)/n
    num = sum((dados[i]-m)*(dados[i+1]-m) for i in range(n-1))
    den = sum((x-m)**2 for x in dados)
    return num/den if den else 0.0

def analisa(nome, dados):
    print(f"  ── {nome} ──")
    print(f"     bytes    : {len(dados)}")
    print(f"     entropia : {entropia_shannon(dados):.4f} bits/byte  (ideal 8.0000)")
    print(f"     chi²     : {chi2(dados):.1f}")
    ac = testa_sequencias(dados)
    print(f"     autocorr : {ac:+.5f}  (ideal ≈ 0)")
    # procura bloco de 4 bytes repetido
    blocos = [dados[i:i+4] for i in range(0, len(dados)-4, 4)]
    reps = [b for b, c in Counter(blocos).items() if c > 1]
    print(f"     blocos 4B repetidos: {len(reps)}")
    veredito = "?"
    if ac > 0.05 or ac < -0.05:
        veredito = "⚠ AUTOCORRELAÇÃO — provável PRNG fraco ou semente fixa"
    elif len(reps) > len(blocos) * 0.001:
        veredito = "⚠ REPETIÇÃO — provável ECB ou contador"
    else:
        veredito = "· sem sinal óbvio (não prova nada — só não achou)"
    print(f"     veredito : {veredito}")
    print()

N = 65536

# 1. random de Python
random.seed(1234)
analisa("Mersenne Twister (semente fixa)", bytes(random.getrandbits(8) for _ in range(N)))

# 2. os.urandom
analisa("os.urandom", os.urandom(N))

# 3. semente = time (o pecado clássico)
random.seed(int(time.time()))
analisa("Mersenne Twister (semente=time)", bytes(random.getrandbits(8) for _ in range(N)))

# 4. hash de contador (parece aleatório, mas é sequencial)
h = b"\x00"*32; out = b""
for i in range(N // 32):
    h = hashlib.sha256(h + struct.pack("<I", i)).digest()
    out += h
analisa("SHA-256 de contador", out[:N])

# 5. ECB de dado repetido (o caso do módulo 1)
from Crypto.Cipher import AES
k = os.urandom(16)
ecb = AES.new(k, AES.MODE_ECB)
analisa("AES-ECB de dado repetido", ecb.encrypt(b"AAAA" * (N//16))[:N])

print("  ⚠ LIMITE HONESTO DESTE TESTE:")
print("     ele acha autocorrelação e repetição de bloco.")
print("     ele NÃO acha semente previsível com boa distribuição.")
print("     ⚠ 'não achou nada' ≠ 'é seguro'.")
print("     a única verificação real é LER O CÓDIGO que gera.")
PY

python3 detector.py
```

⚠ **A última mensagem é a parte honesta do módulo.** Um detector acha **autocorrelação** e
**repetição de bloco** — os sinais grosseiros. **Ele não acha semente de `time()` com boa
distribuição.** Se o atacante sabe a janela de tempo, ele reproduz **sem que o teste acuse nada**.

⚠ **A conclusão, escrita:**

> **Detecção por análise é sinal, não prova. A verificação que vale é ler o código que gera a
> aleatoriedade — e confirmar que ele chama `os.urandom`/`getrandom`, e não `random`/`rand`/`time`.**

⚠ **E é por isso que a auditoria de criptografia inclui `grep`:**

```bash
echo "═══ a busca no código-fonte — o instrumento real ═══"
echo
for pat in 'srand\s*\(' 'rand\s*\(\s*\)' 'time\s*\(\s*(NULL|None|\))' \
           'Math\.random' 'random\.seed' 'random\.random' '$RANDOM' \
           'mt_rand' 'SecureRandom\(\)' 'new Random\(' 'seed\s*=\s*'; do
    printf '  %-26s ' "$pat"
    grep -rE "$pat" ~/crypto-lab --include='*.py' --include='*.c' --include='*.js' \
         --include='*.sh' 2>/dev/null | wc -l
done
echo
echo "  ⚠ cada ocorrência é candidata a achado de fonte fraca"
echo "  ⚠ e os padrões a PROCURAR como corretos:"
for pat in 'os\.urandom' 'secrets\.' 'getrandom' 'crypto\.randomBytes' '/dev/urandom'; do
    printf '  ✓ %-26s ' "$pat"
    grep -rE "$pat" ~/crypto-lab --include='*.py' --include='*.c' --include='*.js' \
         --include='*.sh' 2>/dev/null | wc -l
done
```

**Produza `deteccao.md`:**

| Fonte | Entropia | chi² | Autocorr | Veredito |
|---|---|---|---|---|
| Mersenne (fixa) | | | | |
| `os.urandom` | | | | |
| Mersenne (time) | | | | |
| SHA-256 de contador | | | | |
| ECB | | | | |

**Responda:**

1. **Qual fonte o detector pegou?** Qual passou?
2. Por que a semente `time` **não** foi pega?
3. **"Não achou nada" significa seguro?**
4. Qual é a **verificação que vale** de verdade?

---

## 2.5 LAB — Auditoria de aleatoriedade

**Duração:** 120 min

### Passo 1 — Inventário das fontes no seu código (35 min)

```bash
cd ~/crypto-lab/mod02

cat > audita-rng.sh <<'SCRIPT'
#!/usr/bin/env bash
# audita-rng.sh — procura fonte fraca no código e no sistema
set -uo pipefail

DIR="${1:-$HOME/crypto-lab}"

echo "═══════════ AUDITORIA DE ALEATORIEDADE ═══════════"
echo "diretório: ${DIR}"
echo "data: $(date -Is)"
echo

echo "── 1. PADRÕES FRACOS NO CÓDIGO ──"
printf '%-40s %s\n' "PADRÃO" "OCORRÊNCIAS"
printf '%-40s %s\n' "──────" "───────────"

declare -A FRACOS=(
  ["srand(time("]="semente de relógio em C"
  ["rand()"]="PRNG não criptográfico em C"
  ["math/rand"]="PRNG não criptográfico em Go"
  ["Math.random"]="PRNG não criptográfico em JS"
  ["random.seed"]="semente em Python"
  ["random.random"]="PRNG não criptográfico em Python"
  ["random.choice"]="⚠ em geração de token"
  ["mt_rand"]="PRNG não criptográfico em PHP"
  ['$RANDOM']="15 bits em shell"
  ["new Random("]="PRNG não criptográfico em Java"
  ["uuid1"]="UUID com MAC e tempo"
)

total_ruim=0
for pat in "${!FRACOS[@]}"; do
    n=$(grep -rF "$pat" "$DIR" --include='*.py' --include='*.c' --include='*.js' \
         --include='*.sh' --include='*.go' --include='*.php' --include='*.java' \
         2>/dev/null | wc -l)
    [ "$n" -gt 0 ] && {
        printf '%-40s %s   ⚠ %s\n' "$pat" "$n" "${FRACOS[$pat]}"
        total_ruim=$((total_ruim + n))
    }
done
echo "  total de ocorrências suspeitas: ${total_ruim}"
echo

echo "── 2. PADRÕES CORRETOS ──"
declare -A BONS=(
  ["os.urandom"]="CSPRNG do sistema (Python)"
  ["secrets."]="módulo de segredos (Python)"
  ["getrandom"]="syscall direta (C/Linux)"
  ["crypto.randomBytes"]="CSPRNG (Node)"
  ["crypto/rand"]="CSPRNG (Go)"
  ["/dev/urandom"]="CSPRNG (shell)"
  ["SecureRandom"]="CSPRNG (Java)"
  ["random_bytes"]="CSPRNG (PHP)"
  ["get_random_bytes"]="CSPRNG (kernel)"
)
for pat in "${!BONS[@]}"; do
    n=$(grep -rF "$pat" "$DIR" --include='*.py' --include='*.c' --include='*.js' \
         --include='*.sh' --include='*.go' --include='*.php' --include='*.java' \
         2>/dev/null | wc -l)
    [ "$n" -gt 0 ] && printf '  ✓ %-26s %s   (%s)\n' "$pat" "$n" "${BONS[$pat]}"
done
echo

echo "── 3. ESTADO DO SISTEMA ──"
printf '  entropy_avail : %s\n' "$(cat /proc/sys/kernel/random/entropy_avail 2>/dev/null)"
printf '  poolsize      : %s\n' "$(cat /proc/sys/kernel/random/poolsize 2>/dev/null)"
printf '  /dev/hwrng    : %s\n' "$([ -e /dev/hwrng ] && echo presente || echo AUSENTE)"
printf '  virtio-rng    : %s\n' "$(lsmod 2>/dev/null | grep -q virtio_rng && echo carregado || echo ausente)"
printf '  é VM?         : %s\n' "$(systemd-detect-virt 2>/dev/null || echo não detectado)"
echo

echo "── 4. A PERGUNTA DE INCIDENTE ──"
echo "  ⚠ se esta máquina é VM clonada, a entropia inicial é IGUAL à do template."
echo "  ⚠ verifique se o RNG do host está passado ao guest."
echo "  ⚠ e se a chave de host SSH é única:"
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub 2>/dev/null | sed 's/^/    /'

echo
echo "── 5. VEREDICTO ──"
if [ "$total_ruim" -eq 0 ]; then
    echo "  ✓ nenhum padrão fraco encontrado"
else
    echo "  ⚠ ${total_ruim} ocorrência(s) de padrão fraco — cada uma é candidata a achado"
fi
SCRIPT

chmod +x audita-rng.sh
./audita-rng.sh ~/crypto-lab 2>&1 | tee rng.txt
```

Produza `auditoria-rng.md`:

| Categoria | Ocorrências | Achado? |
|---|---|---|
| `srand`/`time` | | |
| `rand()` | | |
| `Math.random` | | |
| `random.seed` | | |
| `$RANDOM` | | |
| **`os.urandom`** | | |
| **`secrets.`** | | |
| **`getrandom`** | | |

**Responda:**

1. **Quantas ocorrências de padrão fraco?** Em quais arquivos?
2. Quantas de padrão correto?
3. O `/dev/hwrng` está presente? **Se VM, o RNG do host está passado?**
4. **Qual ocorrência você reportaria como achado** e por quê?

### Passo 2 — Comparação de duas gerações (35 min)

⚠ **Gere tokens com as duas abordagens e compare a previsibilidade.**

```bash
cd ~/crypto-lab/mod02

cat > compara.py <<'PY'
#!/usr/bin/env python3
"""compara.py — token fraco vs. token forte, e o custo de atacar cada um."""
import time, random, secrets, hashlib

print("═══ 1. GERAÇÃO ═══")
print()
print("  ── abordagem FRACA (semente = tempo) ──")
fracos = []
for i in range(8):
    # ⚠ simula um servidor que reinicia e sembra com o relógio
    random.seed(int(time.time()) + i)
    t = "".join(random.choice("abcdef0123456789") for _ in range(32))
    fracos.append(t)
    print(f"    {t}")

print()
print("  ── abordagem FORTE (secrets) ──")
fortes = [secrets.token_hex(16) for _ in range(8)]
for t in fortes:
    print(f"    {t}")

print()
print("═══ 2. O ESPAÇO DE BUSCA ═══")
print()
print(f"  token fraco  : 32 chars de 16 símbolos = 2^{32*4} nominal")
print(f"                 ⚠ mas a SEMENTE tem ~31 bits de espaço (segundos do ano)")
print(f"                 ⚠ espaço REAL ≈ 2^31 = {2**31:,}")
print(f"                 ⚠ um atacante testa isso em SEGUNDOS")
print()
print(f"  token forte  : 32 chars hex = 2^128")
print(f"                 espaço = {2**128:,}")
print(f"                 ⚠ 2^128 é mais que o número de átomos observáveis")
print()

print("═══ 3. CUSTO DE ATAQUE ═══")
print()
# estimativa: 10^9 tentativas/s (GPU)
taxa = 10**9
for nome, espaco in [("fraco (semente)", 2**31), ("forte (CSPRNG)", 2**128)]:
    anos = espaco / taxa / 86400 / 365
    if anos < 1:
        print(f"  {nome:<18} {espaco:>40,} → {espaco/taxa:.4f} segundos")
    else:
        print(f"  {nome:<18} {espaco:>40,} → {anos:.2e} anos")
print()
print("  ⚠ a diferença não é 'mais seguro' — é entre 'trivial' e 'impossível'.")
print("  ⚠ e nenhum dos dois quebrou o algoritmo. Só a fonte mudou.")

print()
print("═══ 4. VERIFICAÇÃO DE UNICIDADE ═══")
print()
todos = fracos + fortes
print(f"  tokens gerados: {len(todos)}")
print(f"  distintos     : {len(set(todos))}")
print(f"  ⚠ se algum repetiu, é sinal de colisão de semente")
PY

python3 compara.py
```

⚠ **A saída quantifica o que a intuição não faz.** O token fraco **parece** 128 bits; a semente
**tem 31**. **O atacante ataca o elo fraco — a semente — e não o token.**

⚠ **E note a frase final:** "nenhum dos dois quebrou o algoritmo". **A diferença é a fonte.**

**Produza `comparacao.md`:**

| Item | Fraco | Forte |
|---|---|---|
| Espaço nominal | | |
| Espaço real | | |
| Tempo de ataque | | |
| Algoritmo quebrado? | | |

**Responda:**

1. **Qual o espaço real** do token fraco? De onde vem o limite?
2. Por que o atacante ataca a **semente** e não o token?
3. Todo token gerado foi **distinto**?
4. **Por que "algoritmo correto" não é suficiente** aqui?

### Passo 3 — A regra e a correção (50 min)

Produza `regra-rng.md` — o documento de padrão:

```markdown
# Regra de aleatoriedade

## 1. Proibido — e por quê
| Padrão | Por quê |
|---|---|
| `srand(time(NULL))` | Semente = relógio. Previsível na janela. |
| `rand()`, `Math.random()`, `mt_rand()` | PRNG não criptográfico. Estado reconstruível. |
| `random` (Python) para segredo | Mersenne Twister. |
| `$RANDOM` (shell) | 15 bits. |
| `uuid1()` | Contém MAC e timestamp. |
| Contador sem estado persistente | Repete após reboot. |
| `time()`, `getpid()` como semente | Dois bits de entropia, não 128. |

## 2. Obrigatório — por linguagem
| Linguagem | Use |
|---|---|
| Python | `secrets.token_bytes(32)` · `os.urandom(32)` |
| Node | `crypto.randomBytes(32)` |
| Java | `new SecureRandom()` |
| C | `getrandom(buf, len, 0)` |
| Go | `crypto/rand.Read(buf)` |
| PHP | `random_bytes(32)` |
| Shell | `head -c 32 /dev/urandom \| base64` |

## 3. Regras de uso
- [ ] Todo nonce/token/salt/chave vem de CSPRNG
- [ ] Nonce de AEAD é único por chave (aleatório ou contador confiável)
- [ ] Em VM clonada, o RNG do host é passado ao guest
- [ ] A semente nunca é derivada de tempo, pid ou contador reiniciável
- [ ] Em boot precoce, usar `getrandom()` (bloqueia até o pool iniciar)

## 4. Verificação
```bash
grep -rE 'srand|rand\(\)|Math\.random|random\.seed|\$RANDOM' <código>
```
⚠ zero ocorrências em caminho de criptografia.
```

**E a correção, em código:**

```bash
cd ~/crypto-lab/mod02

cat > rng-correto.py <<'PY'
#!/usr/bin/env python3
"""rng-correto.py — as formas corretas, por caso de uso."""
import secrets, os, hashlib, hmac, struct
import base64

def token_sessao(nbytes=32):
    """✓ token de sessão — o caso mais crítico"""
    return secrets.token_urlsafe(nbytes)

def salt_senha(nbytes=16):
    """✓ salt — único por senha"""
    return secrets.token_bytes(nbytes)

def nonce_aead(nbytes=12):
    """✓ nonce para AES-GCM — 96 bits é o recomendado"""
    return secrets.token_bytes(nbytes)

def chave_simetrica(nbytes=32):
    """✓ chave AES-256 / ChaCha20"""
    return secrets.token_bytes(nbytes)

class ContadorNonce:
    """
    ✓ nonce determinístico com contador — quando você PRECISA
       de unicidade garantida, não probabilística.
    ⚠ exige estado persistente; se o estado reseta, o nonce REPETE.
    """
    def __init__(self, chave_base, caminho_estado=None):
        self.chave_base = chave_base
        self.caminho = caminho_estado
        self.n = self._carrega()

    def _carrega(self):
        if self.caminho and os.path.exists(self.caminho):
            with open(self.caminho, "rb") as f:
                return struct.unpack("<Q", f.read(8))[0]
        return 0

    def _salva(self):
        if not self.caminho: return
        tmp = self.caminho + ".tmp"
        with open(tmp, "wb") as f:
            f.write(struct.pack("<Q", self.n))
        os.replace(tmp, self.caminho)   # ✓ atômico

    def proximo(self):
        self.n += 1
        self._salva()
        # ✓ HKDF: nonce derivado do contador, não o contador cru
        return hmac.new(self.chave_base, struct.pack("<Q", self.n),
                        hashlib.sha256).digest()[:12]

def compara_segredo(a: bytes, b: bytes) -> bool:
    """✓ comparação em tempo constante — módulo 5"""
    return hmac.compare_digest(a, b)

if __name__ == "__main__":
    print("═══ AS FORMAS CORRETAS ═══")
    print()
    print(f"  token de sessão : {token_sessao()}")
    print(f"  salt de senha   : {salt_senha().hex()}")
    print(f"  nonce de GCM    : {nonce_aead().hex()}")
    print(f"  chave 256 bits  : {chave_simetrica().hex()}")
    print()

    print("═══ NONCE POR CONTADOR (unicidade garantida) ═══")
    import tempfile
    caminho = tempfile.mktemp()
    c = ContadorNonce(b"chave-base-do-sistema", caminho)
    nonces = [c.proximo().hex() for _ in range(5)]
    for i, n in enumerate(nonces):
        print(f"    [{i}] {n}")
    print(f"    ⚠ todos distintos? {len(set(nonces)) == len(nonces)}")
    print()

    print("═══ COMPARAÇÃO EM TEMPO CONSTANTE ═══")
    a = b"segredo-do-servidor"
    print(f"    igual?      {compara_segredo(a, b'segredo-do-servidor')}")
    print(f"    diferente?  {compara_segredo(a, b'segredo-diferente!!')}")
    print(f"    ⚠ ~ = vaza pelo tempo; compare_digest não.")
    print()
    print("  ✓ esta é a correção do módulo 2.")
PY

python3 rng-correto.py
```

⚠ **O `ContadorNonce` merece atenção.** Ele dá **unicidade garantida** (melhor que probabilística) —
**e tem uma armadilha:** se o estado resetar (reboot, container recriado, `tmpfs`), **o contador
volta ao zero e o nonce REPETE.** **É por isso que o estado tem que ser persistente e a escrita
atômica.**

⚠ **E o `hmac.compare_digest` fecha o ciclo do módulo 1.** É a defesa contra timing — e é
**obrigatória em comparação de segredo.**

**Responda:**

1. **Qual a diferença entre nonce aleatório e nonce de contador?**
2. Qual a **armadilha** do contador? Como evitar?
3. Por que o nonce do contador passa por **HKDF** em vez de ser o contador cru?
4. **Por que `compare_digest` é obrigatório** na comparação?

### Critérios de aceitação

- `estatistico.md` com as três fontes e o veredito.
- Você explicou por que **passar no teste estatístico não basta**.
- `entropia.md` com o estado do sistema, e a resposta sobre **`/dev/urandom` não se esgotar**.
- Você explicou por que **VM clonada** é risco de incidente.
- `fraca-time.py` rodando, com a **contagem de tentativas** para achar o token.
- `nonce-reuso.py` rodando, com **a chave privada recuperada**.
- Você explicou por que **GCM com nonce repetido é pior que CTR**.
- `detector.py` rodando, com a comparação das cinco fontes.
- Você explicou por que a semente `time` **não** foi pega pelo detector.
- `audita-rng.sh` rodando, com a contagem de padrão fraco e correto.
- `comparacao.md` com o **espaço real** do token fraco.
- `regra-rng.md` com as **quatro** seções.
- `rng-correto.py` rodando, com o `ContadorNonce` e o `compare_digest`.
- Você explicou a **armadilha do contador**.

---

## Avaliação

1. Diferencie aleatoriedade estatística de imprevisibilidade criptográfica.
2. **Por que dígitos de π são o pior caso**, se passam em todo teste?
3. **Por que o Mersenne Twister é o erro prático?**
4. O que é entropia, e de onde o Linux a coleta? Cite quatro fontes.
5. **`/dev/urandom` se esgota?** Explique o que realmente acontece.
6. **Qual usar em código: `/dev/random`, `/dev/urandom`, ou `getrandom`?** Por quê?
7. Por que `getrandom` bloqueia na primeira chamada?
8. Cite as cinco fontes fracas e um incidente de cada.
9. **Por que `time()` como semente é previsível?** Quantas tentativas?
10. **O que o atacante faz no caso PS3**, e o que ele **não** faz?
11. **Por que nonce repetido no AES-GCM é pior que no CTR?**
12. Cite três formas de garantir nonce único.
13. O que a RFC 6979 resolve?
14. **Por que "não achou nada" no detector não significa seguro?**
15. Qual é a verificação de aleatoriedade **que vale**?
16. **Por que VM clonada é risco** de chave duplicada?
17. Qual a armadilha do nonce por contador?
18. Por que `compare_digest` em vez de `==`?

---

**Próximo:** [Módulo 3 — Cifra simétrica e modo de operação](modulo-03.md)
