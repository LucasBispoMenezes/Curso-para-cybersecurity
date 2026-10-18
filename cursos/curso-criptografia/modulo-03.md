# Módulo 3 — Cifra Simétrica e Modo de Operação

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 e 2

---

## Objetivos

1. Entender que **a cifra é o bloco**, e o **modo** é o que transforma bloco em mensagem.
2. Saber **por que cada modo falha**, com o ataque correspondente.
3. Reconhecer ECB, CBC, CTR, CFB, OFB e GCM por leitura de código.
4. Entender IV, nonce e contador — e a diferença entre eles.
5. Escolher o modo certo, e saber por que o AEAD é a resposta moderna.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **AES é uma permutação de 128 bits. Ela cifra 16 bytes — exatamente 16. Transformar isso em
> "cifrar uma mensagem" é o trabalho do modo de operação. E é o modo que quebra.**

⚠ **O AES nunca foi quebrado.** Nem o AES-128, nem o AES-256. **O que quebra é o modo:**

| Modo | A falha | Incidente |
|---|---|---|
| **ECB** | Mesmo bloco → mesmo cyphertext | Vazamento de estrutura |
| **CBC** | Sem MAC → alterável. Padding oracle | ASP.NET, TLS 1.0 |
| **CTR** | Reuso de nonce → XOR dos plaintexts | WEP (com RC4) |
| **OFB** | Reuso de IV → mesmo keystream | — |
| **CFB** | Idem | — |
| **GCM** | Nonce repetido → **chave de autenticação recuperada** | — |

⚠ **E a razão pela qual o módulo é longo:** cada modo tem uma **forma diferente** de falhar, e
**reconhecer qual está em uso** — lendo o código — é o que permite prever **qual** falha vai
acontecer.

---

## 3.1 A cifra é o bloco

⚠ **O AES pega 16 bytes e devolve 16 bytes.** Só isso. **Tudo o mais é o modo.**

```
        ┌─────────────────────────────────────┐
        │   AES-128/192/256                   │
        │   entrada : 16 bytes                │
        │   chave   : 16/24/32 bytes          │
        │   saída   : 16 bytes                │
        │   ⚠ é uma PERMUTAÇÃO                │
        └─────────────────────────────────────┘
                        │
        ⚠ uma mensagem tem N blocos, e cada bloco
          precisa de uma decisão de ENCADEAMENTO
                        │
                        ▼
        ┌─────────────────────────────────────┐
        │   MODO DE OPERAÇÃO                  │
        │   como encadear os blocos           │
        └─────────────────────────────────────┘
```

⚠ **A propriedade do AES que importa:** ele é **determinístico**. A mesma entrada com a mesma chave
dá **sempre a mesma saída**. **É essa propriedade que o modo tem que resolver** — porque em
mensagem **você não quer** que dois blocos iguais virem iguais.

```bash
mkdir -p ~/crypto-lab/mod03 && cd ~/crypto-lab/mod03

echo "═══ 1. AES é determinístico — e isso é o problema ═══"
python3 - <<'PY'
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import binascii

chave = bytes.fromhex("00" * 16)

aes = AES.new(chave, AES.MODE_ECB)
bloco = b"BLOCO-DE-16-BYT"    # exatamente 16

print("  AES-128 com chave fixa, mesmo bloco, 3 vezes:")
for i in range(3):
    print(f"    [{i}] {binascii.hexlify(aes.encrypt(bloco)).decode()}")
print()
print("  ⚠ as três saídas são IDÊNTICAS — AES é determinístico")
print("  ⚠ sem modo, dois blocos iguais no plaintext viram iguais no cyphertext")
print("  ⚠ é exatamente o vazamento do ECB (módulo 1)")
print()
print("  ✓ e o AES está CORRETO. Não é falha dele.")
PY
```

⚠ **A última linha é o ponto do módulo inteiro.** O AES **deve** ser determinístico — é uma
permutação. **É o modo que introduz a variabilidade.** E quando o modo não introduz, **você tem
ECB.**

**Produza `cifra-bloco.md`:**

| Propriedade do AES | Valor | Consequência |
|---|---|---|
| Tamanho do bloco | | |
| Chaves válidas | | |
| Determinístico? | | |
| Quebrado? | | |
| Quem quebra? | | |

**Responda:**

1. **O AES cifra mais de 16 bytes?** Então o que cifra a mensagem?
2. Por que o AES ser determinístico **é correto**?
3. **Quem introduz a variabilidade** entre blocos iguais?
4. O AES já foi quebrado? O que foi?

---

## 3.2 Os seis modos, e a falha de cada um

### ECB — Electronic Codebook

```
   P1        P2        P3
   │         │         │
   ▼         ▼         ▼
┌─────┐   ┌─────┐   ┌─────┐
│ AES │   │ AES │   │ AES │    ⚠ MESMA CHAVE, SEM ENCADEAMENTO
└─────┘   └─────┘   └─────┘
   │         │         │
   ▼         ▼         ▼
   C1        C2        C3
        ⚠ P1 == P2  →  C1 == C2
```

⚠ **A falha:** determinístico **por bloco**. **Vaza estrutura** e **permite reordenar blocos** sem
decifrar.

⚠ **É proibido.** Não há caso de uso legítimo em código novo.

### CBC — Cipher Block Chaining

```
   IV──────┐
           ▼
   P1 ──▶ XOR ──▶┌─────┐──▶ C1 ─────┐
                 │ AES │            │
                 └─────┘            │
                                    ▼
   P2 ─────────────▶ XOR ──▶┌─────┐──▶ C2 ─────┐
                            │ AES │            │
                            └─────┘            │
                                               ▼
   P3 ─────────────────────▶ XOR ──▶┌─────┐──▶ C3
                                    │ AES │
                                    └─────┘
```

⚠ **A falha:** **sem MAC, é alterável.** Um bit alterado no C1 corrompe **P1 inteiro e um byte de
P2** — e o receptor **não sabe**. **É o padding oracle**, e é a classe 1 do curso.

⚠ **E o CBC também é lento:** serial — cada bloco depende do anterior.

### CTR — Counter

```
   nonce‖0 ──▶┌─────┐──▶ keystream 0 ──▶ XOR ──▶ C1
              │ AES │                      ▲
              └─────┘                      │
                                          P1

   nonce‖1 ──▶┌─────┐──▶ keystream 1 ──▶ XOR ──▶ C2
              │ AES │                      ▲
              └─────┘                      │
                                          P2
```

⚠ **A falha:** **o keystream é o mesmo** se o nonce repetir. E então:

$$C_1 \oplus C_2 = P_1 \oplus P_2$$

⚠ **É o ataque do WEP** (com RC4), e é **o mais fácil de explorar** — porque o XOR dos plaintexts
frequentemente é legível (texto com estrutura).

⚠ **A vantagem do CTR:** **paralelizável** e **não precisa padding** — o keystream pode ser gerado
para qualquer tamanho. **É a base do GCM.**

### CFB e OFB — retroalimentação

⚠ **Ambos usam a saída do AES como keystream** — como o CTR. **E ambos sofrem o mesmo problema de
reuso de IV:** IV repetido → keystream repetido → XOR dos plaintexts.

⚠ **A diferença entre eles é o que alimenta o próximo bloco** — e **não muda a falha de reuso.**

### GCM — Galois/Counter Mode

```
   ┌───────────────────────────────────────────────────┐
   │  CTR para confidencialidade                       │
   │  + GHASH para AUTENTICAÇÃO                        │
   │                                                   │
   │  ⚠ o nonce entra nos DOIS                         │
   │  ⚠ nonce repetido → keystream repetido            │
   │                    → E a chave de AUTENTICAÇÃO    │
   │                      (H) é recuperável            │
   │                    → o atacante FORJA mensagens   │
   └───────────────────────────────────────────────────┘
```

⚠ **A falha é a pior de todas, e por isso o GCM exige rigor.** Com nonce repetido:

| Vaza | Consequência |
|---|---|
| O XOR dos plaintexts | Como no CTR |
| **A chave de autenticação H** | ⚠ **O atacante calcula o MAC de qualquer mensagem** |
| Isso quebra **tudo** | ⚠ Não é só confidencialidade — é **forjar mensagem válida** |

⚠ **A conclusão é severa:** **GCM com nonce repetido é pior que não ter MAC**, porque o MAC passa a
ser **calculável pelo atacante**. **É por isso que o GCM exige nonce único — rigorosamente.**

⚠ **E é por isso que o ChaCha20-Poly1305 existe** — ele tem a mesma garantia AEAD, e é mais
tolerante a nonce aleatório em alguns aspectos, além de ser rápido **sem aceleração de hardware**.

```bash
cd ~/crypto-lab/mod03

echo "═══ 2. os seis modos, lado a lado ═══"
python3 - <<'PY'
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import binascii
from collections import Counter

chave = get_random_bytes(16)
dado = b"BLOCO-A-" * 2 + b"BLOCO-B-" + b"BLOCO-A-"   # 16*4 = 64 bytes, com repetição

print(f"  plaintext ({len(dado)} bytes):")
print(f"    {dado}")
print()

def mostra(nome, ct, aviso):
    blocos = [ct[i:i+16] for i in range(0, len(ct), 16)]
    reps = [(binascii.hexlify(b).decode(), n) for b, n in Counter(blocos).items() if n > 1]
    print(f"  ── {nome} ──")
    print(f"     blocos repetidos: {len(reps)}")
    for h, n in reps[:3]:
        print(f"       {h}  ×{n}")
    print(f"     {aviso if reps else '✓ sem repetição'}")
    print()

# ECB
ecb = AES.new(chave, AES.MODE_ECB)
ct = ecb.encrypt(dado)
mostra("ECB", ct, "⚠ VAZA: mesmos blocos = mesmos cyphertexts")

# CBC
iv = get_random_bytes(16)
cbc = AES.new(chave, AES.MODE_CBC, iv=iv)
ct = cbc.encrypt(dado)
mostra("CBC", ct, "⚠ alterável, sem MAC")

# CTR — com nonce NOVO
nonce = get_random_bytes(8)
ctr = AES.new(chave, AES.MODE_CTR, nonce=nonce)
ct = ctr.encrypt(dado)
mostra("CTR (nonce novo)", ct, "⚠ keystream XOR — precisa de MAC")

# CTR — com nonce REUSADO (o ataque)
ctr1 = AES.new(chave, AES.MODE_CTR, nonce=nonce)
ctr2 = AES.new(chave, AES.MODE_CTR, nonce=nonce)
c1 = ctr1.encrypt(dado)
c2 = ctr2.encrypt(b"X" * len(dado))
x = bytes(a ^ b for a, b in zip(c1, c2))
print("  ── CTR com nonce REUSADO ──")
print(f"     C1 ⊕ C2 = {binascii.hexlify(x[:16]).decode()} ...")
print(f"     ⚠ isso É  P1 ⊕ P2 — e não precisa da chave!")
print()

# OFB
iv = get_random_bytes(16)
ofb = AES.new(chave, AES.MODE_OFB, iv=iv)
ct = ofb.encrypt(dado)
mostra("OFB", ct, "⚠ IV reusado = keystream reusado")

# CFB
iv = get_random_bytes(16)
cfb = AES.new(chave, AES.MODE_CFB, iv=iv)
ct = cfb.encrypt(dado)
mostra("CFB", ct, "⚠ IV reusado = keystream reusado")

# GCM
nonce = get_random_bytes(12)
gcm = AES.new(chave, AES.MODE_GCM, nonce=nonce)
ct, tag = gcm.encrypt_and_digest(dado)
print("  ── GCM (AEAD) ──")
print(f"     ct  : {binascii.hexlify(ct[:16]).decode()} ...")
print(f"     tag : {binascii.hexlify(tag).decode()}")
print("     ✓ tag de 16 bytes — alteração é DETECTADA")
print("     ⚠ mas exige nonce ÚNICO. Reuso é catastrófico.")
PY
```

⚠ **A saída tem a linha mais importante do módulo:** a do **CTR com nonce reusado**, mostrando que
$C_1 \oplus C_2 = P_1 \oplus P_2$ — **e isso não exige a chave**.

⚠ **E é o ataque prático mais fácil.** Em texto com estrutura (HTTP, JSON, campos fixos), o XOR de
dois plaintexts é **frequentemente legível** — você reconhece pedaços e deduz o resto. **É o
*crib-drag*, e quebra WEP e VPN mal configurada.**

**Produza `modos.md`:**

| Modo | Precisa IV/nonce? | Encadeia? | Paraleliza? | Falha | Precisa MAC? |
|---|---|---|---|---|---|
| ECB | | | | | |
| CBC | | | | | |
| CTR | | | | | |
| OFB | | | | | |
| CFB | | | | | |
| GCM | | | | | |

**Responda:**

1. **Qual modo não precisa de IV** e por que é proibido?
2. **Por que CTR com nonce reusado não precisa da chave** para vazar `P1 ⊕ P2`?
3. **Por que GCM com nonce repetido é pior que CTR**?
4. Qual modo é **paralelizável** e por que isso importa?

---

## 3.3 IV, nonce e contador — a confusão

⚠ **Os três são "valor que varia por mensagem" — e não são a mesma coisa.**

| Termo | O que é | Precisa de quê | Onde aparece |
|---|---|---|---|
| **IV** | Valor inicial, **pode ser público** | **Imprevisível** (em CBC/CFB/OFB) | CBC, CFB, OFB |
| **Nonce** | *Number used once* | **Único** (não precisa ser secreto) | CTR, GCM, ChaCha20 |
| **Contador** | Sequencial | **Único e persistente** | CTR, GCM |

⚠ **A distinção crítica: IV precisa ser IMPREVISÍVEL; nonce precisa ser ÚNICO.**

| Modo | O que o valor precisa | Por quê |
|---|---|---|
| **CBC** | **Imprevisível** | IV previsível → ataque de *chosen plaintext* no primeiro bloco |
| **CTR** | **Único** | Repetido → keystream repetido |
| **GCM** | **Único** | Repetido → catastrófico |
| **ChaCha20-Poly1305** | **Único** | Repetido → keystream repetido |

⚠ **A linha do CBC é a que confunde.** Em CBC, o IV **não precisa ser secreto** — mas **precisa ser
imprevisível**. Um IV **previsível** (contador, timestamp) permite ao atacante **testar hipóteses
sobre o primeiro bloco**, porque o primeiro bloco de cyphertext é `AES(P1 ⊕ IV)`. **Se ele controla
IV, ele controla a entrada do AES.**

⚠ **E é por isso que o IV deve ser ALEATÓRIO em CBC** — e **único** em CTR/GCM. **São requisitos
diferentes.**

```bash
echo "═══ 3. IV previsível em CBC — a falha ═══"
python3 - <<'PY'
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import binascii

chave = get_random_bytes(16)
msg = b"senha=ABCD1234" + b"\x00" * 2   # 16 bytes exatos

print("  ── IV ALEATÓRIO (✓ correto) ──")
for i in range(3):
    iv = get_random_bytes(16)
    c = AES.new(chave, AES.MODE_CBC, iv=iv)
    ct = c.encrypt(msg)
    print(f"    IV={binascii.hexlify(iv).decode()[:16]}.. → C={binascii.hexlify(ct).decode()[:16]}..")
print("    ✓ as três saídas são diferentes")

print()
print("  ── IV = CONTADOR (⚠ previsível) ──")
for i in range(3):
    iv = (i).to_bytes(16, "big")           # ⚠ previsível
    c = AES.new(chave, AES.MODE_CBC, iv=iv)
    ct = c.encrypt(msg)
    print(f"    IV={binascii.hexlify(iv).decode()[:16]}.. → C={binascii.hexlify(ct).decode()[:16]}..")
print("    ⚠ o atacante SABE o IV de cada mensagem")

print()
print("  ═══ o que isso permite ═══")
print("  Em CBC, C1 = AES(P1 ⊕ IV).")
print("  Se o atacante controla/adivinha o IV, ele controla a ENTRADA do AES.")
print("  ⚠ ele pode testar: 'se P1 fosse X, então C1 seria AES(X ⊕ IV)'.")
print("  ⚠ com IV fixo, ele pode MONTAR uma tabela para blocos prováveis.")
print()
print("  ✓ defesa: IV ALEATÓRIO por mensagem (não contador, não timestamp).")
print("  ⚠ e o IV pode ir em claro junto do cyphertext — não é segredo.")
PY
```

⚠ **A última frase merece destaque:** **o IV pode ir em claro.** Ele **não é segredo** — ele é
**variabilidade**. É por isso que o IV acompanha o cyphertext no arquivo, e por isso que em CBC
**não** se cifra o IV.

⚠ **E a confusão inversa é frequente em CTR:** muita gente usa **contador previsível** como nonce em
CTR, achando que "previsível é ruim". **Em CTR, previsível é OK — o que importa é ÚNICO.** Um
contador **persistente** é perfeito para CTR.

**Produza `iv-nonce.md`:**

| Modo | O valor precisa ser | Pode ser público? | Pode ser previsível? |
|---|---|---|---|
| CBC | | | |
| CTR | | | |
| GCM | | | |
| ChaCha20-Poly1305 | | | |

**Responda:**

1. **CBC precisa de IV imprevisível ou de IV único?** Por quê?
2. **CTR precisa de nonce imprevisível ou de nonce único?** Por quê?
3. O IV pode ir em claro? Por quê?
4. Por que usar **contador previsível** em CTR é **correto** e em CBC é **errado**?

---

## 3.4 Padding — e o oracle

⚠ **CBC exige que a mensagem seja múltiplo do bloco.** E isso cria o padding — e o oracle.

```
   PKCS#7: preenche com N bytes de valor N

   mensagem:  "abc"  (3 bytes, bloco de 16)
   padding:   "abc" + 13 bytes de 0x0d
   ⚠ se já for múltiplo, adiciona um BLOCO inteiro de 0x10

   mensagem:  16 bytes exatos
   padding:   16 bytes de 0x10   ← ⚠ bloco extra
```

⚠ **A propriedade que cria o oracle:** o padding é **verificado** na decifração — e **a mensagem de
erro pode distinguir** "padding inválido" de "padding válido, MAC inválido". **Se o atacante
distingue, ele tem um oráculo.**

```
┌──────────────────────────────────────────────────────────────┐
│  O ORÁCULO                                                   │
├──────────────────────────────────────────────────────────────┤
│  1. atacante altera um byte do penúltimo bloco               │
│  2. manda para o servidor                                    │
│  3. servidor responde:                                       │
│       · "padding inválido"    → o byte estava errado         │
│       · "erro de MAC"         → o PADDING estava CERTO        │
│  4. ⚠ a diferença é a informação                             │
│  5. atacante itera: 256 tentativas por byte                  │
│  6. recupera o plaintext inteiro, SEM a chave                │
└──────────────────────────────────────────────────────────────┘
```

⚠ **É a classe 1 (oracle) do curso, e o módulo 7 e o 8 fazem a demonstração completa.** Aqui você
**vê a origem**: o padding é a **superfície** que gera erro distinguível.

⚠ **A defesa tem três camadas, e a ordem importa:**

| Defesa | Como |
|---|---|
| **1. Usar AEAD** | Não há padding, e a tag é verificada antes |
| **2. Encrypt-then-MAC** | Verifica o MAC **antes** de decifrar — sem decifrar, sem oracle |
| **3. Erro uniforme** | Responder **sempre a mesma coisa** para qualquer falha |

⚠ **A defesa 1 é a resposta moderna.** GCM e ChaCha20-Poly1305 **não têm padding** — e a tag cobre
tudo. **O oracle não existe porque a superfície foi eliminada.**

⚠ **A defesa 3 é o que o TLS 1.2 fez depois do incidente:** parar de distinguir os erros. **É
paliativo** — funciona, mas é frágil (timing ainda vaza). **A defesa 1 é definitiva.**

```bash
echo "═══ 4. o padding, e o erro que gera o oracle ═══"
python3 - <<'PY'
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes

chave = get_random_bytes(16)
iv = get_random_bytes(16)

def pkcs7_pad(d):
    p = 16 - len(d) % 16
    return d + bytes([p]) * p

def pkcs7_unpad(d):
    """⚠ levanta erro distinguível — é ISSO que cria o oracle."""
    if not d or len(d) % 16: raise ValueError("tamanho inválido")
    p = d[-1]
    if p < 1 or p > 16: raise ValueError("padding inválido")
    if d[-p:] != bytes([p]) * p: raise ValueError("padding inválido")
    return d[:-p]

# ── servidor ingênuo: distingue os erros ──
def servidor_ingenuo(ct):
    c = AES.new(chave, AES.MODE_CBC, iv=iv)
    try:
        pt = c.decrypt(ct)
    except Exception:
        return "ERRO_INTERNO"
    try:
        return f"OK: {pkcs7_unpad(pt)[:20]!r}"
    except ValueError as e:
        return f"ERRO: {e}"       # ⚠⚠ mensagem DISTINGUÍVEL

# ── servidor correto: erro uniforme ──
def servidor_uniforme(ct, tag_esperada, mac_key):
    import hmac, hashlib
    tag_calc = hmac.new(mac_key, iv + ct, hashlib.sha256).digest()
    if not hmac.compare_digest(tag_calc, tag_esperada):
        return "ERRO"             # ✓ SEMPRE igual, e ANTES de decifrar
    c = AES.new(chave, AES.MODE_CBC, iv=iv)
    pt = c.decrypt(ct)
    try:
        return f"OK: {pkcs7_unpad(pt)[:20]!r}"
    except ValueError:
        return "ERRO"             # ✓ mesma resposta

msg = b"admin=true"
ct = AES.new(chave, AES.MODE_CBC, iv=iv).encrypt(pkcs7_pad(msg))

print("  ── servidor INGÊNUO ──")
print(f"    ct válido       → {servidor_ingenuo(ct)}")
bad = bytearray(ct); bad[-1] ^= 0xFF
print(f"    ct com 1 bit    → {servidor_ingenuo(bytes(bad))}")
print("    ⚠ respostas DIFERENTES = oráculo")
print()

# simula um oracle simples: quantas tentativas para achar 1 byte?
print("  ── o oráculo em ação (1 byte do último bloco) ──")
alvo = ct
palpite = bytearray(ct)
alvo_byte = palpite[-1]
achou = None
for b in range(256):
    palpite[-1] = b
    r = servidor_ingenuo(bytes(palpite))
    if "padding inválido" not in r and "OK" not in r.replace("ERRO: padding inválido",""):
        pass
    if "padding inválido" not in r:
        achou = b
        break
print(f"    byte testado: {alvo_byte:02x}")
print(f"    candidatos até achar um padding válido: {achou if achou is not None else 256}")
print("    ⚠ e é assim, byte a byte, bloco a bloco, que o plaintext sai inteiro")
print()

print("  ── servidor UNIFORME ──")
import hmac, hashlib
mk = get_random_bytes(32)
tag = hmac.new(mk, iv + ct, hashlib.sha256).digest()
print(f"    ct válido       → {servidor_uniforme(ct, tag, mk)}")
print(f"    ct alterado     → {servidor_uniforme(bytes(bad), tag, mk)}")
print("    ✓ resposta IDÊNTICA — o atacante não distingue nada")
print("    ✓ e a verificação acontece ANTES de decifrar")
PY
```

⚠ **A saída tem as duas defesas lado a lado.** O ingênuo **distingue**, e o uniforme **não** — e a
ordem no uniforme (**verifica primeiro, decifra depois**) é o que **elimina a superfície**.

⚠ **E a frase final do módulo, sobre padding:**

> **O padding não é o problema. O problema é o padding combinado com uma resposta que distingue.**
> **Remova qualquer um dos dois, e o oracle morre.**

**Produza `padding.md`:**

| Item | Valor | Problema |
|---|---|---|
| Padding PKCS#7 para 16 bytes | | |
| Padding para múltiplo exato | | |
| Erro distinguível | | |
| Defesa 1 | | |
| Defesa 2 | | |
| Defesa 3 | | |

**Responda:**

1. Uma mensagem de **16 bytes exatos** ganha padding? **Quanto?**
2. **O que cria o oráculo** — o padding, ou a resposta?
3. **Por que AEAD elimina o oracle** por construção?
4. Por que verificar **antes** de decifrar elimina o oracle?

---

## 3.5 LAB — Os modos na prática e a escolha

**Duração:** 150 min

### Passo 1 — Reproduza cada falha (45 min)

```bash
cd ~/crypto-lab/mod03

cat > falhas-modos.py <<'PY'
#!/usr/bin/env python3
"""falhas-modos.py — demonstra a falha de cada modo, no seu laboratório."""
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import binascii
from collections import Counter

CHAVE = get_random_bytes(16)

def bloco_reps(ct):
    bs = [ct[i:i+16] for i in range(0, len(ct), 16)]
    return [(binascii.hexlify(b).decode(), n) for b, n in Counter(bs).items() if n > 1]

print("═══════════ FALHA 1: ECB VAZA ESTRUTURA ═══════════")
print()
# dado com estrutura — como dado real tem
dado = (b"user=ana;role=admin;" + b"\x00" * 12) + (b"user=bob;role=user;" + b"\x00" * 12) + \
       (b"user=ana;role=admin;" + b"\x00" * 12)

ecb = AES.new(CHAVE, AES.MODE_ECB)
ct = ecb.encrypt(dado)
reps = bloco_reps(ct)
print(f"  plaintext: 3 blocos, sendo que 1º e 3º são IGUAIS")
print(f"  cyphertext: {len(ct)//16} blocos")
for h, n in reps:
    inds = [i for i in range(len(ct)//16) if ct[i*16:(i+1)*16].hex() == h]
    print(f"    ⚠ {h} ×{n}  nos índices {inds}")
    print(f"      o atacante SABE que os blocos {inds} têm o mesmo conteúdo — sem a chave")
print()

print("═══════════ FALHA 2: CBC É ALTERÁVEL ═══════════")
print()
iv = get_random_bytes(16)
cbc = AES.new(CHAVE, AES.MODE_CBC, iv=iv)
msg = b"transferir 100 reais para conta A" + b"\x00"
ct = cbc.encrypt(msg + bytes([16 - len(msg) % 16]) * (16 - len(msg) % 16))

print(f"  original : {msg[:28]}")
alvo = bytearray(ct); alvo[0] ^= 0x01
d = AES.new(CHAVE, AES.MODE_CBC, iv=iv)
pt = d.decrypt(bytes(alvo))
print(f"  alterado : {pt[:28]}")
print("  ⚠ o receptor decifra SEM SABER que foi alterado")
print("  ⚠ primeira metade do 1º bloco virou lixo, e um bit do 2º também")
print("     (é assim que CBC propaga: P1 inteiro + 1 byte de P2)")
print()

print("═══════════ FALHA 3: CTR COM NONCE REUSADO ═══════════")
print()
nonce = get_random_bytes(8)
p1 = b"GET /admin HTTP/1.1\r\nHost: x\r\n\r\n"
p2 = b"GET /login HTTP/1.1\r\nHost: x\r\n\r\n"
p2 = p2 + b"\x00" * (len(p1) - len(p2))

c1 = AES.new(CHAVE, AES.MODE_CTR, nonce=nonce).encrypt(p1)
c2 = AES.new(CHAVE, AES.MODE_CTR, nonce=nonce).encrypt(p2)
x = bytes(a ^ b for a, b in zip(c1, c2))

print(f"  P1 = {p1[:28]}")
print(f"  P2 = {p2[:28]}")
print(f"  C1 ⊕ C2 = {x[:28]}")
print()
print("  ⚠ se o atacante sabe P1 (é texto conhecido), ele obtém P2:")
p2_rec = bytes(a ^ b for a, b in zip(x, p1))
print(f"     P2 recuperado = {p2_rec[:28]}")
print(f"     ✓ correto? {p2_rec == p2}")
print("  ⚠ NENHUMA chave foi usada. É XOR.")
print()

print("═══════════ FALHA 4: GCM COM NONCE REUSADO ═══════════")
print()
nonce = get_random_bytes(12)
import hmac, hashlib
m1, m2 = b"mensagem A", b"mensagem B"
g1 = AES.new(CHAVE, AES.MODE_GCM, nonce=nonce)
c1, t1 = g1.encrypt_and_digest(m1)
g2 = AES.new(CHAVE, AES.MODE_GCM, nonce=nonce)
c2, t2 = g2.encrypt_and_digest(m2)

print(f"  mensagem A: ct={binascii.hexlify(c1).decode()}")
print(f"  mensagem B: ct={binascii.hexlify(c2).decode()}")
x = bytes(a ^ b for a, b in zip(c1, c2))
print(f"  C1 ⊕ C2   = {binascii.hexlify(x).decode()}")
print(f"  P1 ⊕ P2   = {binascii.hexlify(bytes(a^b for a,b in zip(m1,m2))).decode()}")
print(f"  ⚠ iguais? {x == bytes(a^b for a,b in zip(m1,m2))}")
print()

# a falha extra do GCM: a chave de autenticação H
print("  ⚠ e o pior: com nonce reusado, H (a chave de autenticação) é recuperável.")
print("     Demonstração algébrica (o módulo 8 faz a exploração completa):")
print()
print("     no GCM,  T = GHASH(H, AAD, C) ⊕ E_K(J0)")
print("     com o MESMO J0 (mesmo nonce), o E_K(J0) é o mesmo")
print("     → T1 ⊕ T2 = GHASH(H,A,C1) ⊕ GHASH(H,A,C2)")
print("     → GHASH é polinômio em H sobre GF(2^128)")
print("     → com 2 tags, você tem equação em H; com 3, resolve")
print("     ⚠ e com H, o atacante FORJA a tag de QUALQUER mensagem")
print()
print("     ⚠ GCM com nonce reusado é pior que não ter MAC.")

print()
print("═══════════ RESUMO ═══════════")
print()
print("  ECB  → vaza estrutura (blocos iguais)")
print("  CBC  → alterável; padding oracle")
print("  CTR  → nonce reusado = XOR dos plaintexts")
print("  OFB  → IV reusado = keystream reusado")
print("  CFB  → idem")
print("  GCM  → nonce reusado = catástrofe (H recuperável)")
print()
print("  ✓ e o AES está correto em TODOS.")
PY

python3 falhas-modos.py
```

Produza `falhas.md`:

| Modo | A falha demonstrada | Precisa da chave? | Consequência |
|---|---|---|---|
| ECB | | | |
| CBC | | | |
| CTR | | | |
| GCM | | | |

**Responda:**

1. Em CBC, quantos bytes são corrompidos por **um bit** alterado?
2. Em CTR, **a chave foi usada** para recuperar `P2`?
3. **Qual falha é a mais grave** e por quê?
4. **O AES falhou em algum caso?**

### Passo 2 — A escolha do modo (40 min)

```bash
cd ~/crypto-lab/mod03

cat > escolha.py <<'PY'
#!/usr/bin/env python3
"""escolha.py — a construção certa para cada caso."""
import os, hmac, hashlib, secrets
from Crypto.Cipher import AES, ChaCha20_Poly1305

def mk(n=32): return secrets.token_bytes(n)

# ═══════════════════════════════════════════════════════════
# ✓ FORMA 1 — AEAD (a recomendada)
# ═══════════════════════════════════════════════════════════
def cifra_aead(chave, dado, aad=b""):
    """AES-GCM. ⚠ nonce único por chave."""
    nonce = secrets.token_bytes(12)
    c = AES.new(chave, AES.MODE_GCM, nonce=nonce)
    if aad:
        c.update(aad)
    ct, tag = c.encrypt_and_digest(dado)
    return nonce + tag + ct          # ✓ empacota: nonce|tag|ct

def decifra_aead(chave, pacote, aad=b""):
    nonce, tag, ct = pacote[:12], pacote[12:28], pacote[28:]
    c = AES.new(chave, AES.MODE_GCM, nonce=nonce)
    if aad:
        c.update(aad)
    return c.decrypt_and_verify(ct, tag)   # ✓ VERIFICA antes de devolver

# ═══════════════════════════════════════════════════════════
# ✓ FORMA 2 — ChaCha20-Poly1305 (sem AES-NI, ou mobile)
# ═══════════════════════════════════════════════════════════
def cifra_chacha(chave, dado, aad=b""):
    nonce = secrets.token_bytes(12)
    c = ChaCha20_Poly1305.new(key=chave, nonce=nonce)
    if aad:
        c.update(aad)
    ct, tag = c.encrypt_and_digest(dado)
    return nonce + tag + ct

# ═══════════════════════════════════════════════════════════
# ✓ FORMA 3 — Encrypt-then-MAC (quando você PRECISA de CBC)
# ═══════════════════════════════════════════════════════════
def cifra_etm(k_enc, k_mac, dado):
    iv = secrets.token_bytes(16)
    pad = 16 - len(dado) % 16
    ct = AES.new(k_enc, AES.MODE_CBC, iv=iv).encrypt(dado + bytes([pad]) * pad)
    tag = hmac.new(k_mac, iv + ct, hashlib.sha256).digest()
    return iv + tag + ct                # ✓ MAC cobre IV E ct

def decifra_etm(k_enc, k_mac, pacote):
    iv, tag, ct = pacote[:16], pacote[16:48], pacote[48:]
    esperada = hmac.new(k_mac, iv + ct, hashlib.sha256).digest()
    if not hmac.compare_digest(tag, esperada):
        raise ValueError("autenticacao falhou")   # ✓ ANTES de decifrar
    pt = AES.new(k_enc, AES.MODE_CBC, iv=iv).decrypt(ct)
    p = pt[-1]
    if p < 1 or p > 16: raise ValueError("autenticacao falhou")   # ✓ erro uniforme
    return pt[:-p]

# ═══════════════════════════════════════════════════════════
# ✗ FORMA 4 — CBC SEM MAC (o que NÃO fazer)
# ═══════════════════════════════════════════════════════════
def cifra_cbc_errada(chave, dado):
    iv = secrets.token_bytes(16)
    pad = 16 - len(dado) % 16
    ct = AES.new(chave, AES.MODE_CBC, iv=iv).encrypt(dado + bytes([pad]) * pad)
    return iv + ct
    # ⚠ sem tag: alterável, e a decifração pode levantar erro distinguível


if __name__ == "__main__":
    k = mk(32)
    ke, km = mk(16), mk(32)
    msg = b"dado sensivel do sistema"
    aad = b"usuario:1000"           # ⚠ dado autenticado mas não cifrado

    print("═══ CIFRA AEAD (AES-GCM) ═══")
    p = cifra_aead(k, msg, aad)
    print(f"  pacote : {p.hex()[:48]}...  ({len(p)} bytes)")
    print(f"  decifra: {decifra_aead(k, p, aad)}")
    try:
        decifra_aead(k, p[:-1] + bytes([p[-1] ^ 1]), aad)
        print("  ⚠ alteração NÃO detectada")
    except Exception:
        print("  ✓ alteração DETECTADA — tag não confere")
    try:
        decifra_aead(k, p, b"usuario:1001")
        print("  ⚠ AAD alterado NÃO detectado")
    except Exception:
        print("  ✓ AAD alterado DETECTADO — é para isso que serve o AAD")
    print()

    print("═══ ChaCha20-Poly1305 ═══")
    p = cifra_chacha(k, msg, aad)
    print(f"  pacote : {p.hex()[:48]}...  ({len(p)} bytes)")
    print("  ✓ mesmo esquema: nonce|tag|ct")
    print()

    print("═══ Encrypt-then-MAC (CBC + HMAC) ═══")
    p = cifra_etm(ke, km, msg)
    print(f"  pacote : {p.hex()[:48]}...  ({len(p)} bytes)")
    print(f"  decifra: {decifra_etm(ke, km, p)}")
    try:
        decifra_etm(ke, km, p[:-1] + bytes([p[-1] ^ 1]))
        print("  ⚠ alteração NÃO detectada")
    except Exception:
        print("  ✓ alteração DETECTADA")
    print()

    print("═══ A COMPARAÇÃO ═══")
    print()
    print("  ┌─────────────────┬────────┬────────┬─────────┬──────────┐")
    print("  │ construção      │ tag?   │ ordem  │ padding │ oracle?  │")
    print("  ├─────────────────┼────────┼────────┼─────────┼──────────┤")
    print("  │ AEAD (GCM)      │ ✓ 16B  │ feito  │ nenhum  │ ✗ não    │")
    print("  │ ChaCha20-Poly   │ ✓ 16B  │ feito  │ nenhum  │ ✗ não    │")
    print("  │ Encrypt-then-MAC│ ✓ 32B  │ manual │ PKCS#7  │ ✗ não    │")
    print("  │ CBC sem MAC     │ ✗      │ —      │ PKCS#7  │ ⚠ SIM    │")
    print("  └─────────────────┴────────┴────────┴─────────┴──────────┘")
    print()
    print("  ✓ preferência: AEAD. CBC só com Encrypt-then-MAC e erro uniforme.")
PY

python3 escolha.py
```

⚠ **O AAD merece atenção especial.** Ele é **dado autenticado mas não cifrado** — no exemplo,
`usuario:1000`. **Isso resolve a falha do módulo 1:** o servidor autentica **a quem pertence** a
mensagem, sem precisar cifrar esse campo. **E se alguém altera o AAD, a tag não confere.**

⚠ **É assim que se amarra contexto a um cyphertext.** Estado, ID de sessão, versão de protocolo —
tudo isso vai no AAD, e o atacante **não consegue** mover o cyphertext para outro contexto.

**Produza `escolha.md`:**

| Construção | Tag? | Padding? | Verifica antes? | Oracle? |
|---|---|---|---|---|
| AEAD (GCM) | | | | |
| ChaCha20-Poly1305 | | | | |
| Encrypt-then-MAC | | | | |
| CBC sem MAC | | | | |

**Responda:**

1. **O que o AAD resolve?** Dê um exemplo de uso.
2. Por que a alteração do AAD é detectada?
3. **Quantas tags o AEAD acrescenta?** E o Encrypt-then-MAC?
4. **Se o AEAD é sempre preferível, quando você ainda usaria Encrypt-then-MAC?**

### Passo 3 — A ferramenta de inspeção (65 min)

⚠ **Escreva o instrumento que você usará em auditoria: dado um cyphertext, qual modo foi usado?**

```bash
cd ~/crypto-lab/mod03

cat > identifica-modo.py <<'PY'
#!/usr/bin/env python3
"""
identifica-modo.py — heurística para identificar o modo a partir do cyphertext.

⚠ NÃO é prova. É indício, para orientar a leitura do código.
   A confirmação é sempre ler o código que gerou.
"""
import sys, binascii
from collections import Counter

def analisa(nome, pacote, tamanho_bloco=16):
    print(f"  ── {nome} ──")
    print(f"     tamanho: {len(pacote)} bytes")

    # 1. é múltiplo do bloco?
    mult = len(pacote) % tamanho_bloco == 0
    print(f"     múltiplo de {tamanho_bloco}: {'sim' if mult else 'NÃO'}")

    if not mult:
        print("     → ⚠ NÃO múltiplo do bloco: provavelmente CTR/GCM (stream)")
        print()
        return

    # 2. blocos repetidos?
    bs = [pacote[i:i+tamanho_bloco] for i in range(0, len(pacote), tamanho_bloco)]
    reps = [(b, n) for b, n in Counter(bs).items() if n > 1]
    print(f"     blocos: {len(bs)}   repetidos: {len(reps)}")

    if reps:
        print(f"     → ⚠⚠ BLOCOS REPETIDOS = ECB (ou CTR com nonce reusado)")
        for b, n in reps[:3]:
            inds = [i for i, x in enumerate(bs) if x == b]
            print(f"        {binascii.hexlify(b).decode()} ×{n} em {inds}")
        print()
        return

    # 3. sobrou algum bloco extra no fim (PKCS#7 sempre adiciona se exato)
    print("     → sem repetição: CBC, CTR, GCM ou OFB/CFB")
    print("     ⚠ precisa do CÓDIGO para decidir:")
    print("        · tem tag de 16 bytes no fim? → GCM/ChaCha20")
    print("        · nonce/IV de 12 ou 16 bytes no início? → GCM/CBC")
    print("        · bloco extra quando o dado era múltiplo? → PKCS#7 em CBC")
    print()

def main():
    from Crypto.Cipher import AES
    from Crypto.Random import get_random_bytes
    import secrets

    chave = get_random_bytes(16)
    dado = b"BLOCO-IGUAL-16B" * 3 + b"MAIS-DADOS-16BY" + b"BLOCO-IGUAL-16B"

    print("═══ IDENTIFICANDO O MODO PELO CYPHERTEXT ═══")
    print()

    # ECB
    ct = AES.new(chave, AES.MODE_ECB).encrypt(dado)
    analisa("ECB (AES-128)", ct)

    # CBC
    iv = secrets.token_bytes(16)
    ct = iv + AES.new(chave, AES.MODE_CBC, iv=iv).encrypt(dado)
    analisa("CBC com IV no início", ct)

    # CTR
    nonce = secrets.token_bytes(8)
    ct = AES.new(chave, AES.MODE_CTR, nonce=nonce).encrypt(dado)
    analisa("CTR (8B nonce interno)", ct)

    # GCM
    nonce = secrets.token_bytes(12)
    c = AES.new(chave, AES.MODE_GCM, nonce=nonce)
    ct, tag = c.encrypt_and_digest(dado)
    analisa("GCM (pacote nonce|tag|ct)", nonce + tag + ct)

    print("═══ A CONCLUSÃO HONESTA ═══")
    print()
    print("  este analisador distingue DUAS coisas com confiança:")
    print("    · bloco repetido        → ECB (ou CTR/GCM com nonce reusado)")
    print("    · tamanho não múltiplo  → stream (CTR/GCM/ChaCha20)")
    print()
    print("  ⚠ e MAIS NADA. CBC, CTR com nonce novo, GCM e OFB são")
    print("     indistinguíveis sem ler o código.")
    print()
    print("  ⚠ a única verificação que vale:")
    print("     grep -rn 'MODE_' <código>   → ver o modo declarado")
    print("     grep -rn 'nonce\\|iv' <código> → ver COMO o nonce é gerado")

if __name__ == "__main__":
    main()
PY

python3 identifica-modo.py
```

⚠ **A conclusão honesta é o entregável.** O analisador distingue **bloco repetido** (ECB) e
**tamanho não múltiplo** (stream). **O resto é indistinguível** — e a verificação que vale é **ler
o código**.

⚠ **E é por isso que a auditoria de criptografia tem dois passos:**

| Passo | O que olha | O que encontra |
|---|---|---|
| **1. Estático** | O **código** | `MODE_ECB`, nonce de `time()`, `==` em segredo |
| **2. Dinâmico** | O **cyphertext** | Bloco repetido, tamanho anômalo |

⚠ **O passo 1 é o que vale.** O passo 2 **confirma** e **mede** — mas não substitui a leitura.

**Produza `identificacao.md`:**

| Pacote | Múltiplo? | Blocos repetidos | Conclusão |
|---|---|---|---|
| ECB | | | |
| CBC+IV | | | |
| CTR | | | |
| GCM | | | |

**Responda:**

1. **Qual modo o analisador identificou com confiança?**
2. Quais modos ficaram **indistinguíveis**?
3. **Qual a verificação que vale de verdade?** Escreva o comando.
4. Por que o analisador é **indício** e não **prova**?

### Critérios de aceitação

- `cifra-bloco.md` com as cinco propriedades e a conclusão de que **o AES está correto**.
- `modos.md` com os **seis** modos e as cinco colunas preenchidas.
- `falhas-modos.py` rodando, com as **quatro** falhas demonstradas.
- Você demonstrou **`C1 ⊕ C2 = P1 ⊕ P2`** em CTR, e recuperou `P2` **sem a chave**.
- `iv-nonce.md` com a distinção entre IV (imprevisível) e nonce (único).
- Você explicou por que **contador em CTR é correto** e **em CBC é errado**.
- `padding.md` com as **três** defesas e o que cada uma elimina.
- Você explicou o que **cria** o oracle — padding ou resposta.
- `escolha.py` rodando, com as **quatro** construções.
- Você demonstrou **detecção de AAD alterado**.
- `identifica-modo.py` rodando, com a **conclusão honesta** sobre os limites.
- Você escreveu o **`grep`** que é a verificação que vale.
- Você explicou por que o analisador é **indício** e não prova.

---

## Avaliação

1. Por que o AES é uma **permutação de bloco**, e o que isso implica?
2. **Por que o AES ser determinístico é correto?** Quem introduz variabilidade?
3. Descreva a falha de ECB, com o efeito no cyphertext.
4. **Quantos bytes CBC corrompe** quando 1 bit muda? Por quê?
5. **Por que CTR com nonce reusado não precisa da chave?** Mostre a equação.
6. **Por que GCM com nonce repetido é pior que CTR?** O que é recuperável?
7. Por que ChaCha20-Poly1305 existe, se GCM já é AEAD?
8. **Diferencie IV de nonce.** Qual precisa ser imprevisível? Qual precisa ser único?
9. Por que o IV pode ir **em claro** junto do cyphertext?
10. **Por que contador é correto em CTR e errado em CBC?**
11. Descreva o padding PKCS#7 para 16 bytes exatos.
12. **O que cria o padding oracle** — o padding ou a resposta?
13. Cite as **três** defesas contra padding oracle, e o que cada uma elimina.
14. **Como você identifica o modo pelo cyphertext?** O que dá para distinguir?
15. Qual a **verificação que vale** para descobrir o modo em uso?
16. Para que serve o **AAD**? Dê um exemplo.
17. **O que o AEAD faz que você teria que fazer à mão?**
18. Cite **um caso legítimo** de uso de CBC em código novo.

---

**Próximo:** [Módulo 4 — Chave: derivação, troca, envelope, rotação](modulo-04.md)
