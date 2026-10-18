# Módulo 9 — Correção e Construção Segura

**Carga:** 2 horas (45 min teoria · 1h15 lab)
**Pré-requisitos:** Módulos 1 a 8

---

## Objetivos

1. Conhecer a **construção certa** para cada problema, sem inventar.
2. Aplicar as **quatro correções** e provar que funcionam.
3. Entender por que **não inventar criptografia** é regra prática, não formalidade.
4. Montar a **biblioteca de referência** própria — código que você reusa.
5. Fechar o ciclo: cada falha do módulo 7 tem **uma** correção.

---

## ⚠ Antes de começar

⚠ **A regra que organiza o módulo:**

> **Não invente criptografia. Use a construção que existe, e use a biblioteca que existe.** Você
> não vai escrever AES, não vai escrever HMAC, e **não vai escrever o modo de composição**.

⚠ **As razões são três, e todas práticas:**

| Você não escreve | Por quê |
|---|---|
| **A primitiva** | Ela tem duas décadas de análise; o seu `AES` tem uma tarde |
| **O modo de composição** | A ordem e o que o MAC cobre **é** a correção (módulo 7) |
| **A comparação, o KDF, o RNG** | A biblioteca padrão já fez, e fez certo |

⚠ **E a consequência:** **99% das correções são "usar a função certa"**, não "escrever a função
certa". **O módulo é curto porque a correção é curta** — o trabalho estava em **achar**.

⚠ **Esta é a nota de propósito:** você usa bibliotecas **existentes e auditadas**. **Nenhum código
deste módulo implementa primitiva** — ele **chama** a que existe.

---

## 9.1 A construção certa para cada problema

⚠ **A tabela completa. É o entregável central do curso.**

| Você quer | Construção | Biblioteca | ⚠ Não faça |
|---|---|---|---|
| Cifrar dado (com integridade) | **AEAD** | `AESGCM`, `ChaCha20Poly1305` | CBC sem MAC |
| Cifrar dado grande | **Envelope** | AEAD + RSA-OAEP/ECIES | RSA direto no dado |
| Guardar senha | **argon2id** | `argon2-cffi`, `bcrypt` | SHA-256, MD5 |
| Derivar chave | **HKDF** | `cryptography` HKDF | SHA-256 direto |
| Acordo de chave | **X25519** | `X25519PrivateKey` | DH cru sem autenticação |
| Assinar | **Ed25519** | `Ed25519PrivateKey` | RSA PKCS#1 v1.5 |
| MAC | **HMAC-SHA-256** | `hmac.new` | `sha256(k+msg)` |
| Comparar segredo | **`compare_digest`** | `hmac` | `==`, `memcmp` |
| Aleatoriedade | **CSPRNG** | `secrets`, `os.urandom` | `random`, `time` |
| Canal | **TLS 1.3** | não escreva | TLS próprio |
| Token | **JWT com `alg` fixo** | `PyJWT` com `algorithms=` | ler `alg` do token |
| Identificar conteúdo | **SHA-256** | `hashlib` | usar como autenticação |

⚠ **A linha do "canal" merece ênfase:** **não escreva cifra de canal.** TLS é o resultado de **duas
décadas** de correção de falhas — cada versão corrigiu um ataque da versão anterior. **Você não
reproduz isso.**

⚠ **E a linha do "token" é a que mais aparece em correção:** **`algorithms=[...]` é obrigatório** no
`PyJWT` moderno. **Sem ele, a biblioteca levanta erro** — o que é a proteção sendo explícita.

**Produza `construcoes.md`:**

| Problema | Construção | Biblioteca | Não use |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Por que não escrever cifra de canal?**
2. Por que **não escrever o modo de composição** é parte da regra?
3. Qual linha você **já viu** ser violada?
4. **Qual é a construção para "cifrar dado com integridade"?**

---

## 9.2 As quatro correções, com prova

⚠ **Cada falha do módulo 7 tem uma correção. Aqui você aplica e **prova**.**

### Correção 1 — Oracle: AEAD ou Encrypt-then-MAC

```bash
mkdir -p ~/crypto-lab/mod09 && cd ~/crypto-lab/mod09

cat > correcoes.py <<'PY'
#!/usr/bin/env python3
"""
correcoes.py — as construções corretas, com prova de que funcionam.
⚠ usa biblioteca existente. NENHUMA primitiva é implementada aqui.
"""
import os, hmac, hashlib, secrets, base64, json, time
from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

# ═══════════════════════════════════════════════════════════════
# 1. ORACLE → AEAD (a superfície não existe)
# ═══════════════════════════════════════════════════════════════
class CifraAEAD:
    """
    ✓ AEAD: confidencialidade + integridade, sem padding.
    ⚠ nonce ÚNICO por chave. Isso é responsabilidade sua.
    """
    def __init__(self, chave: bytes, versao: int = 1):
        if len(chave) != 32: raise ValueError("chave de 32 bytes")
        self.aead = AESGCM(chave)
        self.versao = versao

    def cifra(self, dado: bytes, aad: bytes = b"") -> bytes:
        nonce = secrets.token_bytes(12)        # ✓ por mensagem
        ct = self.aead.encrypt(nonce, dado, aad)
        return bytes([self.versao]) + nonce + ct

    def decifra(self, pacote: bytes, aad: bytes = b"") -> bytes:
        """
        ⚠ levanta SEMPRE a mesma exceção — não vaza o motivo.
        ⚠ e o AEAD verifica a tag ANTES de devolver qualquer coisa.
        """
        if len(pacote) < 13: raise ValueError("autenticacao falhou")
        nonce, ct = pacote[1:13], pacote[13:]
        try:
            return self.aead.decrypt(nonce, ct, aad)
        except Exception:
            raise ValueError("autenticacao falhou")   # ✓ uniforme

# ═══════════════════════════════════════════════════════════════
# 2. NONCE REUSADO → nonce único, com as duas estratégias
# ═══════════════════════════════════════════════════════════════
class NonceAleatorio:
    """✓ probabilístico. Bom para < 2^32 mensagens por chave."""
    def __init__(self, aead):
        self.aead = aead
    def cifra(self, dado, aad=b""):
        return self.aead.encrypt(secrets.token_bytes(12), dado, aad)

class NonceContador:
    """
    ✓ determinístico. Unicidade GARANTIDA — se o estado persistir.
    ⚠ a escrita precisa ser ATÔMICA, ou o contador repete após crash.
    """
    def __init__(self, aead, caminho: str):
        self.aead = aead
        self.caminho = caminho
        self.n = self._carrega()
    def _carrega(self):
        try:
            with open(self.caminho, "rb") as f: return int.from_bytes(f.read(8), "big")
        except Exception: return 0
    def _salva(self):
        tmp = self.caminho + ".tmp"
        with open(tmp, "wb") as f: f.write(self.n.to_bytes(8, "big"))
        os.replace(tmp, self.caminho)      # ✓ atômico — POSIX
    def cifra(self, dado, aad=b""):
        self.n += 1
        self._salva()                       # ✓ ANTES de usar
        # ⚠ nonce derivado, não o contador cru
        nonce = hmac.new(b"nonce", self.n.to_bytes(8, "big"), hashlib.sha256).digest()[:12]
        return self.aead.encrypt(nonce, dado, aad)

# ═══════════════════════════════════════════════════════════════
# 3. TIMING → comparação em tempo constante
# ═══════════════════════════════════════════════════════════════
def compara(a: bytes, b: bytes) -> bool:
    """✓ UMA linha. É a correção completa do timing attack."""
    return hmac.compare_digest(a, b)

# ═══════════════════════════════════════════════════════════════
# 4. VALIDAÇÃO AUSENTE → fixar o algoritmo, exigir os campos
# ═══════════════════════════════════════════════════════════════
class ValidaToken:
    """
    ✓ algoritmo FIXO no código, campos obrigatórios, comparação constante.
    """
    ALGORITMOS = ("HS256",)          # ⚠ FIXO. nunca lido do token.

    def __init__(self, chave: bytes, ttl: int = 3600):
        self.k = chave
        self.ttl = ttl

    def _b64u(self, b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
    def _b64d(self, s):
        s += "=" * (-len(s) % 4)
        return base64.urlsafe_b64decode(s)

    def emite(self, sub: str, role: str) -> str:
        agora = int(time.time())
        cab = self._b64u(b'{"alg":"HS256","typ":"JWT"}')
        pay = self._b64u(json.dumps(
            {"iat": agora, "exp": agora + self.ttl, "sub": sub, "role": role},
            separators=(',',':'), sort_keys=True).encode())
        assin = self._b64u(hmac.new(self.k, f"{cab}.{pay}".encode(), hashlib.sha256).digest())
        return f"{cab}.{pay}.{assin}"

    def valida(self, token: str) -> dict:
        try:
            cab_b, pay_b, assin_b = token.split(".")
            cab = json.loads(self._b64d(cab_b))
            pay = json.loads(self._b64d(pay_b))

            # ✓ 1. algoritmo fixo — rejeita 'none' e confusão RS/HS
            if cab.get("alg") not in self.ALGORITMOS:
                raise ValueError

            # ✓ 2. assinatura, em tempo constante
            esperada = self._b64u(hmac.new(self.k, f"{cab_b}.{pay_b}".encode(),
                                           hashlib.sha256).digest())
            if not hmac.compare_digest(assin_b, esperada):
                raise ValueError

            # ✓ 3. campos OBRIGATÓRIOS
            for c in ("iat", "exp", "sub", "role"):
                if c not in pay: raise ValueError

            # ✓ 4. janela de validade
            agora = int(time.time())
            if pay["iat"] > agora + 60: raise ValueError
            if pay["exp"] < agora: raise ValueError

            return pay
        except Exception:
            raise ValueError("token invalido")    # ✓ uniforme

# ═══════════════════════════════════════════════════════════════
# 5. ENTROPIA → CSPRNG, e derivação com HKDF
# ═══════════════════════════════════════════════════════════════
def deriva(segredo: bytes, proposito: str, nbytes: int = 32) -> bytes:
    """✓ HKDF com rótulo. Um segredo, N chaves independentes."""
    return HKDF(algorithm=hashes.SHA256(), length=nbytes, salt=None,
                info=proposito.encode()).derive(segredo)


if __name__ == "__main__":
    import tempfile
    print("═══════════ AS CORREÇÕES, COM PROVA ═══════════")
    print()

    # ── 1. AEAD ──
    print("── 1. ORACLE → AEAD ──")
    chave = secrets.token_bytes(32)
    c = CifraAEAD(chave)
    pac = c.cifra(b"token=admin", aad=b"user:1000")
    print(f"   pacote: {pac.hex()[:40]}...")
    print(f"   decifra: {c.decifra(pac, aad=b'user:1000')}")

    # alteração detectada
    pac_bad = pac[:-1] + bytes([pac[-1] ^ 1])
    try:
        c.decifra(pac_bad, aad=b"user:1000"); print("   ⚠ aceitou alteração")
    except ValueError as e:
        print(f"   ✓ alteração detectada: {e}")

    # AAD errado detectado
    try:
        c.decifra(pac, aad=b"user:9999"); print("   ⚠ aceitou AAD errado")
    except ValueError as e:
        print(f"   ✓ AAD errado detectado: {e}")

    # uniformidade: as duas respostas são IGUAIS
    e1 = None
    try: c.decifra(pac_bad, aad=b"user:1000")
    except ValueError as ex: e1 = str(ex)
    e2 = None
    try: c.decifra(pac, aad=b"user:9999")
    except ValueError as ex: e2 = str(ex)
    print(f"   ⚠ as duas mensagens são IGUAIS? {e1 == e2}  → sem oracle")
    print()

    # ── 2. nonces ──
    print("── 2. NONCE → aleatório e contador ──")
    aead = AESGCM(chave)
    na = NonceAleatorio(aead)
    n1 = na.cifra(b"m1"); n2 = na.cifra(b"m1")
    print(f"   aleatório: dois cyphertexts do MESMO dado")
    print(f"     {n1.hex()[:24]}...")
    print(f"     {n2.hex()[:24]}...")
    print(f"     ⚠ iguais? {n1 == n2}   → nonce diferente, ct diferente ✓")

    tmp = tempfile.mktemp()
    nc = NonceContador(aead, tmp)
    c1 = nc.cifra(b"m1"); c2 = nc.cifra(b"m1")
    print(f"   contador : contador em {nc.n}")
    print(f"     {c1.hex()[:24]}...")
    print(f"     {c2.hex()[:24]}...")
    print(f"     ⚠ iguais? {c1 == c2}   → contador avança ✓")
    os.unlink(tmp)
    print()

    # ── 3. timing ──
    print("── 3. TIMING → comparação constante ──")
    import statistics
    seg = secrets.token_bytes(32)
    def mede(f, n=2000):
        ts = []
        for _ in range(n):
            t0 = time.perf_counter_ns(); f(); ts.append(time.perf_counter_ns() - t0)
        return statistics.median(ts)

    print(f"   {'bytes certos':>12}  {'tempo (ns)':>11}")
    for acertos in [0, 16, 31]:
        p = seg[:acertos] + bytes([seg[acertos] ^ 1]) + b"\x00" * (31 - acertos)
        print(f"   {acertos:>12}  {mede(lambda: compara(p, seg)):>11}")
    print("   ✓ PLANO — não revela quantos bytes estão certos")
    print()

    # ── 4. token ──
    print("── 4. VALIDAÇÃO → algoritmo fixo + campos ──")
    vt = ValidaToken(secrets.token_bytes(32))
    tok = vt.emite("1000", "leitor")
    print(f"   válido     : {vt.valida(tok)}")
    forjado = base64.urlsafe_b64encode(b'{"alg":"none"}').rstrip(b"=").decode() + \
              "." + tok.split(".")[1] + "."
    try:
        vt.valida(forjado); print("   ⚠ alg=none ACEITO")
    except ValueError as e:
        print(f"   ✓ alg=none rejeitado: {e}")
    # sem exp
    cab = base64.urlsafe_b64encode(b'{"alg":"HS256"}').rstrip(b"=").decode()
    pay = base64.urlsafe_b64encode(json.dumps({"sub":"1","role":"a"},separators=(',',':')).encode()).rstrip(b"=").decode()
    assin = base64.urlsafe_b64encode(hmac.new(vt.k, f"{cab}.{pay}".encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
    try:
        vt.valida(f"{cab}.{pay}.{assin}"); print("   ⚠ sem exp ACEITO")
    except ValueError as e:
        print(f"   ✓ sem exp rejeitado: {e}")
    print()

    # ── 5. derivação ──
    print("── 5. ENTROPIA → derivação com HKDF ──")
    mestre = secrets.token_bytes(32)
    for p in ["app/encryption", "app/authentication", "app/jwt"]:
        print(f"   {p:<22} {deriva(mestre, p).hex()[:32]}...")
    print("   ✓ um segredo, três chaves independentes")
    print()

    print("═══ RESUMO: FALHA → CORREÇÃO ═══")
    print()
    print("  ┌───────────────────────┬──────────────────────────────────┐")
    print("  │ falha (módulo 7)      │ correção                          │")
    print("  ├───────────────────────┼──────────────────────────────────┤")
    print("  │ oracle de erro        │ AEAD, erro uniforme               │")
    print("  │ oracle de tempo       │ hmac.compare_digest               │")
    print("  │ nonce reusado         │ nonce 96 bits / contador atômico  │")
    print("  │ entropia fraca        │ secrets / os.urandom              │")
    print("  │ MAC extendível        │ hmac.new, nunca hash(k+msg)       │")
    print("  │ JWT sem alg fixo      │ algorithms=[...] no código        │")
    print("  │ sem expiração         │ options={'require': ['exp']}      │")
    print("  │ verify=False          │ remover a linha                   │")
    print("  │ downgrade             │ HSTS + TLS 1.2 mínimo             │")
    print("  └───────────────────────┴──────────────────────────────────┘")
PY

python3 correcoes.py
```

⚠ **O bloco final é o mapa completo do curso:** **cada falha do módulo 7 com a sua correção.** E
note que **nenhuma das nove exige escrever criptografia** — todas são **usar a função certa**.

⚠ **E a prova da uniformidade é o detalhe:** o script captura **as duas mensagens de exceção** e
compara. **Se forem iguais, não há oracle.** **É a verificação, não a intenção.**

**Produza `correcoes.md`:**

| Falha | Correção | Linhas | Verificado |
|---|---|---|---|
| Oracle de erro | | | |
| Oracle de tempo | | | |
| Nonce reusado | | | |
| Entropia fraca | | | |
| MAC extendível | | | |
| JWT sem `alg` | | | |
| `verify=False` | | | |
| Downgrade | | | |

**Responda:**

1. **O script implementou alguma primitiva?**
2. **Como ele provou que não há oracle** no AEAD?
3. Qual correção é a **mais curta**?
4. Qual correção exige **mudança de formato de dado**?

---

## 9.3 Por que não inventar

⚠ **A regra tem exceções — e elas são instrutivas.**

| Isso é inventar? | ⚠ Cuidado |
|---|---|
| Escolher a construção e os parâmetros | **Não** — é o seu trabalho, e é o curso |
| Compor AEAD + envelope + KDF | **Não** — composição de construção é feita com construção |
| **Escrever a primitiva** | ⚠ **Sim** — nunca |
| **Escrever o modo** | ⚠ **Sim** — nunca |
| **Escrever o protocolo** | ⚠ **Sim** — quase nunca |
| Escrever o **formato do cyphertext** | **Não** — é seu, e precisa de versão |
| Escrever a **política de rotação** | **Não** — é seu |

⚠ **A linha do protocolo merece nuance.** Escrever o **seu** protocolo é risco — **mas existem
protocolos que você **usa**:** TLS, Noise, Signal. **A regra é "use protocolo existente", não
"nunca escreva nada".**

⚠ **E o caso do Noise merece destaque:** ele é um **framework** para você **montar** um protocolo a
partir de peças prontas. **É a resposta quando você precisa de protocolo próprio** — porque as
peças e as combinações **já foram analisadas**.

⚠ **A tabela de "onde a correção mora":**

| Camada | Você escreve? | Por quê |
|---|---|---|
| Primitiva | **Não** | Biblioteca auditada |
| Modo | **Não** | É onde a composição acontece |
| Construção | **Escolhe** | É decisão de projeto |
| Formato do dado | **Sim** | Seu, com versão |
| Política (rotação, retenção) | **Sim** | Seu, e é onde a maioria falha |
| Protocolo | **Use existente** | TLS, Noise, Signal |

⚠ **A linha da política é a que o curso mais insiste.** **A criptografia pode estar perfeita e o
sistema inseguro** — porque a chave nunca rotaciona, o log vaza o dado, ou o segredo está no
repositório. **É a política que dá segurança de verdade.**

**Produza `nao-inventar.md`:**

| Camada | Você escreve? | Por quê |
|---|---|---|
| Primitiva | | |
| Modo | | |
| Construção | | |
| Formato | | |
| Política | | |
| Protocolo | | |

**Responda:**

1. **Por que a camada da política é a mais importante** na prática?
2. O que o **Noise** resolve?
3. **Escrever o formato do cyphertext** é inventar criptografia?
4. Qual camada você **nunca** escreve?

---

## 9.4 A biblioteca de referência

⚠ **O entregável prático: um módulo que você **reusa** — não reescreve a cada projeto.**

```bash
cd ~/crypto-lab/mod09

cat > cripto_seguro.py <<'PY'
#!/usr/bin/env python3
"""
cripto_seguro.py — a biblioteca de referência do curso.
⚠ usa bibliotecas auditadas. NENHUMA primitiva é implementada.

Uso:
    from cripto_seguro import Cofre, Senha, Token, RNG, compara

    cofre = Cofre.de_ambiente("CHAVE_MESTRA")
    pacote = cofre.cifra(b"dado", aad=b"contexto")
"""
import os, hmac, hashlib, secrets, base64, json, time, struct
from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.exceptions import InvalidTag

VERSAO_FORMATO = 1
MAGIC = b"CSv1"

# ═══════════════════════════════════════════════════════════════
class RNG:
    """✓ A ÚNICA forma de obter aleatoriedade aqui."""
    @staticmethod
    def bytes(n: int) -> bytes:        return secrets.token_bytes(n)
    @staticmethod
    def token(n: int = 32) -> str:     return secrets.token_urlsafe(n)
    @staticmethod
    def nonce() -> bytes:              return secrets.token_bytes(12)
    @staticmethod
    def salt(n: int = 16) -> bytes:    return secrets.token_bytes(n)
    @staticmethod
    def chave(n: int = 32) -> bytes:   return secrets.token_bytes(n)

# ═══════════════════════════════════════════════════════════════
def compara(a: bytes, b: bytes) -> bool:
    """✓ comparação em tempo constante."""
    return hmac.compare_digest(a, b)

# ═══════════════════════════════════════════════════════════════
class FalhaAutenticacao(Exception):
    """⚠ UMA exceção. Não distingue motivo. É o que mata o oracle."""
    pass

# ═══════════════════════════════════════════════════════════════
class Cofre:
    """
    ✓ Cifra AEAD com VERSÃO DE CHAVE e subchaves derivadas.

    Formato: MAGIC | versao(1) | nonce(12) | ct+tag
    """
    def __init__(self, chave_mestra: bytes, versao: int = 1):
        if len(chave_mestra) < 32:
            raise ValueError("chave mestra de 32 bytes ou mais")
        self._mestra = chave_mestra
        self._versao = versao
        # ✓ subchave por propósito (módulo 4)
        self._k_enc = self._deriva(b"cofre/encryption")
        self._aead = AESGCM(self._k_enc)

    def _deriva(self, proposito: bytes, n: int = 32) -> bytes:
        return HKDF(algorithm=hashes.SHA256(), length=n, salt=None,
                    info=proposito).derive(self._mestra)

    @classmethod
    def de_ambiente(cls, nome: str, versao: int = 1):
        """✓ segredo do ambiente/cofre — nunca do código."""
        v = os.environ.get(nome)
        if not v:
            raise RuntimeError(f"{nome} nao definido — use um cofre")
        raw = base64.b64decode(v) if len(v) % 4 == 0 else v.encode()
        return cls(raw, versao)

    def cifra(self, dado: bytes, aad: bytes = b"") -> bytes:
        nonce = RNG.nonce()
        ct = self._aead.encrypt(nonce, dado, aad)
        return MAGIC + bytes([self._versao]) + nonce + ct

    def decifra(self, pacote: bytes, aad: bytes = b"") -> bytes:
        if not pacote.startswith(MAGIC):
            raise FalhaAutenticacao()
        if pacote[4] != self._versao:
            raise FalhaAutenticacao()      # ⚠ uniforme, mesmo para versão
        nonce, ct = pacote[5:17], pacote[17:]
        try:
            return self._aead.decrypt(nonce, ct, aad)
        except (InvalidTag, Exception):
            raise FalhaAutenticacao()       # ✓ UM erro só

# ═══════════════════════════════════════════════════════════════
class Senha:
    """✓ argon2id. O ÚNICO jeito de guardar senha."""
    @staticmethod
    def guarda(senha: bytes) -> str:
        try:
            from argon2 import PasswordHasher
            ph = PasswordHasher(time_cost=3, memory_cost=65536,
                                parallelism=1, hash_len=32, salt_len=16)
            return ph.hash(senha.decode())
        except ImportError:
            salt = RNG.salt()
            h = hashlib.pbkdf2_hmac("sha256", senha, salt, 600_000, 32)
            return f"pbkdf2$600000${base64.b64encode(salt).decode()}${base64.b64encode(h).decode()}"

    @staticmethod
    def verifica(senha: bytes, guardado: str) -> bool:
        try:
            from argon2 import PasswordHasher
            from argon2.exceptions import VerifyMismatchError
            ph = PasswordHasher()
            try:
                ph.verify(guardado, senha.decode()); return True
            except VerifyMismatchError:
                return False
        except ImportError:
            try:
                _, it, s, h = guardado.split("$")
                calc = hashlib.pbkdf2_hmac("sha256", senha,
                                           base64.b64decode(s), int(it), 32)
                return hmac.compare_digest(calc, base64.b64decode(h))
            except Exception:
                return False

# ═══════════════════════════════════════════════════════════════
class Token:
    """✓ JWT com algoritmo FIXO, campos obrigatórios, comparação constante."""
    ALGORITMOS = ("HS256",)              # ⚠ FIXO no código

    def __init__(self, chave: bytes, ttl: int = 3600):
        self.k = chave
        self.ttl = ttl

    @staticmethod
    def _e(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
    @staticmethod
    def _d(s):
        s += "=" * (-len(s) % 4)
        return base64.urlsafe_b64decode(s)

    def emite(self, sub: str, role: str) -> str:
        agora = int(time.time())
        cab = self._e(b'{"alg":"HS256","typ":"JWT"}')
        pay = self._e(json.dumps(
            {"iat": agora, "exp": agora + self.ttl, "nbf": agora,
             "sub": sub, "role": role},
            separators=(',',':'), sort_keys=True).encode())
        sig = self._e(hmac.new(self.k, f"{cab}.{pay}".encode(), hashlib.sha256).digest())
        return f"{cab}.{pay}.{sig}"

    def valida(self, token: str) -> dict:
        try:
            c_b, p_b, s_b = token.split(".")
            cab, pay = json.loads(self._d(c_b)), json.loads(self._d(p_b))

            # ✓ 1. algoritmo fixo
            if cab.get("alg") not in self.ALGORITMOS: raise ValueError
            # ✓ 2. assinatura em tempo constante
            esp = self._e(hmac.new(self.k, f"{c_b}.{p_b}".encode(), hashlib.sha256).digest())
            if not compara(s_b.encode(), esp.encode()): raise ValueError
            # ✓ 3. campos obrigatórios
            for c in ("iat", "exp", "nbf", "sub", "role"):
                if c not in pay: raise ValueError
            # ✓ 4. janela
            agora = int(time.time())
            if pay["nbf"] > agora + 60: raise ValueError
            if pay["iat"] > agora + 60: raise ValueError
            if pay["exp"] < agora: raise ValueError
            return pay
        except Exception:
            raise ValueError("token invalido")   # ✓ uniforme

# ═══════════════════════════════════════════════════════════════
class Mac:
    """✓ HMAC com contexto — separa usos."""
    def __init__(self, chave_mestra: bytes):
        self.k = HKDF(algorithm=hashes.SHA256(), length=32, salt=None,
                      info=b"mac").derive(chave_mestra)

    def calcula(self, dado: bytes, contexto: str) -> bytes:
        return hmac.new(self.k, f"ctx:{contexto}|".encode() + dado, hashlib.sha256).digest()

    def verifica(self, dado: bytes, tag: bytes, contexto: str) -> bool:
        return compara(self.calcula(dado, contexto), tag)


if __name__ == "__main__":
    print("═══════════ A BIBLIOTECA DE REFERÊNCIA ═══════════")
    print()

    print("── cofre (AEAD + versão) ──")
    cofre = Cofre(RNG.chave(32))
    p = cofre.cifra(b"dado sensivel", aad=b"user:1000")
    print(f"   pacote  : {p.hex()[:44]}...")
    print(f"   decifra : {cofre.decifra(p, aad=b'user:1000')}")
    for nome, f in [
        ("alterado", lambda: cofre.decifra(p[:-1] + bytes([p[-1]^1]), aad=b"user:1000")),
        ("AAD errado", lambda: cofre.decifra(p, aad=b"user:9999")),
        ("mensagem curta", lambda: cofre.decifra(b"xy", aad=b"")),
    ]:
        try:
            f(); print(f"   ⚠ {nome} ACEITO")
        except FalhaAutenticacao:
            print(f"   ✓ {nome} → FalhaAutenticacao (mesma exceção, sem oracle)")
    print()

    print("── senha (argon2id) ──")
    h = Senha.guarda(b"minha-senha")
    print(f"   hash    : {h[:60]}...")
    print(f"   correta : {Senha.verifica(b'minha-senha', h)}")
    print(f"   errada  : {Senha.verifica(b'outra', h)}")
    print()

    print("── token (alg fixo) ──")
    t = Token(RNG.chave(32))
    tok = t.emite("1000", "leitor")
    print(f"   válido  : {t.valida(tok)}")
    ng = base64.urlsafe_b64encode(b'{"alg":"none"}').rstrip(b"=").decode() + "." + tok.split(".")[1] + "."
    try:
        t.valida(ng); print("   ⚠ alg=none ACEITO")
    except ValueError:
        print("   ✓ alg=none rejeitado")
    print()

    print("── MAC com contexto ──")
    m = Mac(RNG.chave(32))
    ta = m.calcula(b"d", "login")
    tb = m.calcula(b"d", "backup")
    print(f"   login  : {ta.hex()[:32]}...")
    print(f"   backup : {tb.hex()[:32]}...")
    print(f"   ⚠ iguais? {ta == tb}  → contexto separa")
    print(f"   verifica: {m.verifica(b'd', ta, 'login')}")
    print()

    print("═══ O QUE ESTA BIBLIOTECA NÃO FAZ ═══")
    print()
    print("  · não implementa AES, HMAC, SHA — usa as bibliotecas")
    print("  · não inventa modo de operação — usa AEAD")
    print("  · não implementa protocolo — para canal, use TLS")
    print()
    print("  ✓ o que ela faz: escolher a construção, fixar a política,")
    print("     e dar um lugar único onde a decisão está correta.")
    print()
    print("  ⚠ é isso que 'não inventar criptografia' quer dizer na prática.")
PY

python3 cripto_seguro.py 2>/dev/null || python3 cripto_seguro.py
```

⚠ **A biblioteca é o entregável que você **reusa**.** Ela não implementa nada — ela **escolhe** a
construção certa e **fixa a política**. **É o que o módulo recomenda.**

⚠ **E o bloco final é a declaração de escopo:** **não implementa primitiva, não inventa modo, não
implementa protocolo.** **Faz o que é seu:** composição e política.

**Produza `biblioteca.md`:**

| Classe | O que resolve | Construção usada |
|---|---|---|
| `Cofre` | | |
| `Senha` | | |
| `Token` | | |
| `Mac` | | |
| `RNG` | | |
| `compara` | | |

**Responda:**

1. **A biblioteca implementou alguma primitiva?**
2. **O que ela faz**, então?
3. Por que `FalhaAutenticacao` é **uma exceção só**?
4. Qual classe **exige mudança de formato** para funcionar?

---

## 9.5 LAB — Aplicar a correção no alvo do módulo 7

**Duração:** 75 min

### Passo 1 — Corrija o alvo (40 min)

```bash
cd ~/crypto-lab/mod09

echo "═══ comparando o alvo do módulo 7 com a correção ═══"
echo

cat > diff-correcao.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail

echo "  ┌──────────────────────────────┬──────────────────────────────┐"
echo "  │ ⚠ ANTES (alvo-falho.py)      │ ✓ DEPOIS (cripto-seguro.py)  │"
echo "  ├──────────────────────────────┼──────────────────────────────┤"
printf '  │ %-28s │ %-28s │\n' "random.choice(...)" "secrets.token_urlsafe"
printf '  │ %-28s │ %-28s │\n' "nonce = b'\\x00'*12" "secrets.token_bytes(12)"
printf '  │ %-28s │ %-28s │\n' "except: raise ValueError(f'{e}')" "raise FalhaAutenticacao()"
printf '  │ %-28s │ %-28s │\n' "sha256(k + msg)" "hmac.new(k, msg, sha256)"
printf '  │ %-28s │ %-28s │\n' "mac(msg) == tag" "compare_digest(tag, esp)"
printf '  │ %-28s │ %-28s │\n' "'usuario nao encontrado'" "'credenciais invalidas'"
printf '  │ %-28s │ %-28s │\n' "if cab['alg'] == 'HS256'" "if alg not in ALGORITMOS"
printf '  │ %-28s │ %-28s │\n' "sem require de exp" "for c in (...) if c not in"
printf '  │ %-28s │ %-28s │\n' "sha256(str(time.time()))" "HKDF(mestra, proposito)"
echo "  └──────────────────────────────┴──────────────────────────────┘"
SCRIPT
chmod +x diff-correcao.sh
./diff-correcao.sh

echo
echo "═══ a migração: o que muda no formato do dado ═══"
echo
cat <<'EXPL'
  ┌────────────────────────────┬───────────────┬───────────────┐
  │ item                       │ antes         │ depois        │
  ├────────────────────────────┼───────────────┼───────────────┤
  │ versão de key no pacote    │ ✗ ausente     │ ✓ 1 byte      │
  │ versão de formato          │ ✗ ausente     │ ✓ MAGIC       │
  │ nonce no pacote            │ ✓ mas fixo    │ ✓ por mensagem│
  │ tag                        │ ✓ 16 bytes    │ ✓ 16 bytes    │
  │ AAD                        │ ✗ não usado   │ ✓ com contexto│
  └────────────────────────────┴───────────────┴───────────────┘

  ⚠ a migração exige CAMPO DE VERSÃO — sem ele, dados antigos
     e novos são indistinguíveis, e nenhum dos dois decifra.
EXPL
```

Produza `migracao.md`:

| Item | Antes | Depois | Exige migração? |
|---|---|---|---|
| Token | | | |
| Nonce | | | |
| Erro | | | |
| MAC | | | |
| Comparação | | | |
| JWT | | | |
| Derivação | | | |
| Formato | | | |

**Responda:**

1. **Qual correção exige mudança de formato?**
2. **Por que o campo de versão é necessário** para migrar?
3. Qual correção é **transparente** (não muda formato)?
4. **Como você migraria** dado já cifrado? (Dica: decifra com a antiga, recifra com a nova.)

### Passo 2 — Escreva a regra de correção (35 min)

Produza `regra-correcao.md`:

```markdown
# Regra de correção — o mapa completo

## Falha → Correção → Verificação
| Classe | Falha | Correção | Como verificar |
|---|---|---|---|
| 1 | erro distinguível | AEAD + erro uniforme | as respostas são idênticas |
| 1 | tempo de comparação | `compare_digest` | tempo é plano |
| 1 | enumeração de usuário | resposta única | mesma msg para os dois casos |
| 2 | nonce constante | nonce 96 bits aleatório | dois ct do mesmo dado são diferentes |
| 2 | nonce previsível | idem, ou contador atômico | contador persiste após reboot |
| 2 | nonce curto | 96 bits | colisão após 2^48 |
| 3 | `random`/`time` | `secrets`/`os.urandom` | `grep` não acha padrão fraco |
| 3 | hash de senha | argon2id | hash muda a cada chamada |
| 4 | MAC `hash(k+msg)` | `hmac.new` | extensão não funciona |
| 4 | `==` em segredo | `compare_digest` | tempo plano |
| 4 | `alg` do token | `algorithms` fixo | `alg=none` é rejeitado |
| 4 | sem `exp` | `require` de campos | token sem `exp` é rejeitado |
| 4 | `verify=False` | remover | `grep` não acha |
| 5 | protocolo antigo | TLS 1.2 mínimo | `s_client -tls1` falha |
| 5 | sem HSTS | header HSTS | `curl -I` mostra |
| 5 | downgrade | HSTS + preload | navegador recusa http |

## Ordem de aplicação
1. **Remover a linha** — `verify=False`, `alg` do token (menor esforço)
2. **Trocar a função** — `random` → `secrets`, `==` → `compare_digest`
3. **Trocar a construção** — CBC → AEAD, `hash(k+msg)` → HMAC
4. **Mudar o formato** — adicionar versão, AAD (exige migração)
5. **Mudar a política** — rotação, retenção, HSTS

## Verificação
```bash
grep -rF 'verify=False' .          # validação desligada
grep -rEn 'sha256\(.*(key|secret)' . # MAC errado
grep -rF 'random.' . | grep -i token # RNG fraco
grep -rEn '== (tag|mac|sig)' .      # comparação
```
```

**Responda:**

1. **Qual é a correção de menor esforço** e maior impacto?
2. **Qual exige migração de dado?**
3. Por que a **ordem de aplicação** importa?
4. **Se você só pudesse aplicar uma prioridade**, qual seria?

### Critérios de aceitação

- `construcoes.md` com as **doze** linhas de problema → construção.
- Você explicou por que **não escrever cifra de canal**.
- `correcoes.py` rodando, com as **cinco** correções e a prova de uniformidade.
- Você demonstrou que **as duas mensagens de exceção são iguais** no AEAD.
- Você demonstrou **nonce aleatório** e **contador** gerando cyphertexts diferentes.
- Você demonstrou **`compare_digest` sendo plano**.
- `nao-inventar.md` com as **seis** camadas.
- Você explicou **por que a política é a camada mais importante**.
- `cripto_seguro.py` rodando, com as **seis** classes.
- Você confirmou que a biblioteca **não implementa primitiva**.
- `migracao.md` com as **oito** linhas e a resposta sobre formato.
- Você explicou **como migraria dado já cifrado**.
- `regra-correcao.md` com o mapa completo e a **ordem de aplicação**.

---

## Avaliação

1. **Cite a construção certa** para: cifrar dado, guardar senha, derivar chave, comparar segredo.
2. **Por que não escrever a primitiva?** E o modo? E o protocolo?
3. **O que você escreve**, então, em criptografia aplicada?
4. Por que **a política** é a camada mais importante na prática?
5. O que o **Noise** resolve? Quando você o usaria?
6. **Cite as três razões** para não inventar composição.
7. Qual a construção para **cifrar dado com integridade**?
8. Por que **`FalhaAutenticacao` única** resolve o oracle de erro?
9. **Como você prova** que não há oracle? Descreva a verificação.
10. Por que **`compare_digest` é a correção completa** do timing?
11. Nas duas estratégias de nonce, **qual é determinística**? Qual o requisito dela?
12. Por que o contador precisa de **escrita atômica**?
13. **O que o campo de versão no pacote resolve?**
14. **Como migrar dado já cifrado** para a construção nova?
15. Cite as **três** correções de "remover a linha".
16. Por que `algorithms=[...]` é **obrigatório** no PyJWT?
17. Qual correção é **paliativa** e qual é **definitiva** no oracle?
18. **Escrever o formato do cyphertext** é inventar criptografia?
19. Por que **HSTS é decisão de política** e não de código?
20. **Qual a ordem de aplicação das correções?** Por quê?

---

**Próximo:** [Módulo 10 — Projeto: revisão de criptografia](modulo-10.md)
