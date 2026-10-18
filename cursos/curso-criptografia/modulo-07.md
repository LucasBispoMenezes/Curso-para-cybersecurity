# Módulo 7 — As Cinco Classes de Falha

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Reconhecer as **cinco classes** por **leitura de código**, antes de rodar.
2. Relacionar cada classe com o **padrão de código** que a produz.
3. Saber qual classe cada ferramenta pega — e qual **nenhuma** pega.
4. Montar a **tabela de reconhecimento** que você usará em auditoria.
5. Distinguir falha de **primitiva** de falha de **protocolo** e de **implementação**.

---

## ⚠ Este é o módulo central do curso

Os módulos 1 a 6 ensinaram as primitivas. **Este ensina a achar a falha olhando o código** — que é
a habilidade de quem audita criptografia.

⚠ **A tese do módulo:**

> **Falha de criptografia não é aleatória. Ela tem cinco formas, e você reconhece as cinco por
> padrão de código. Quando você vê o padrão, a falha está lá.**

⚠ **E o inverso vale:** quando você **não** vê o padrão, **a falha pode estar lá do mesmo jeito** —
porque a classe 5 (protocolo) não tem padrão local. **Cada lado da frase é metade do trabalho.**

---

## 7.1 O mapa das cinco classes

| # | Classe | Origem | Reconhece por | Ferramenta |
|---|---|---|---|---|
| 1 | **Oracle** | Erro distinguível | Mensagem diferente para falha diferente | Nenhuma automática |
| 2 | **Nonce/IV reusado** | Esquema determinístico | Contador, constante, `time()` | Nenhuma automática |
| 3 | **Entropia fraca** | Semente previsível | `rand()`, `time()`, `Math.random` | `grep` |
| 4 | **Validação ausente** | O código não verifica | `verify=False`, `alg` do token, `==` | `grep` |
| 5 | **Protocolo** | Negociação permissiva | Downgrade, versão antiga, compressão | Scanner de config |

⚠ **A coluna "ferramenta" conta uma história:** **nenhuma ferramenta pega a classe 1 e a 2.** Elas
exigem **leitura** — e é por isso que auditoria de criptografia **não é automatizável** por completo.

⚠ **E a classe 5 é a que engana:** o código de **cada lado está correto** — a falha está na
**interação**. **É a mais difícil de ver por leitura local**, e por isso exige o **scanner de
configuração**.

---

## 7.2 Classe 1 — Oracle

⚠ **A definição:** o sistema **revela informação por comportamento distinguível**.

| Tipo de oráculo | O que distingue | Exemplo |
|---|---|---|
| **Padding** | "padding inválido" vs. "MAC inválido" | ASP.NET, TLS 1.0 |
| **Tempo** | Comparação que para no primeiro byte | Comparação com `==` |
| **Erro** | Mensagem diferente | "senha errada" vs. "usuário não existe" |
| **Tamanho** | Comprimento do cyphertext | Compressão (CRIME) |
| **Comportamento** | Resposta diferente para entrada diferente | RSA (Bleichenbacher) |

⚠ **Os padrões que produzem oracle:**

```python
# ── padrão 1: mensagem de erro específica ──
except PaddingError:
    return "padding invalido"        # ⚠⚠
except MACError:
    return "mac invalido"            # ⚠⚠ distingue

# ── padrão 2: early return na comparação ──
for i in range(len(a)):
    if a[i] != b[i]:
        return False                 # ⚠⚠ para no primeiro diferente

# ── padrão 3: mensagem de autenticação que vaza existência ──
if not user_existe(login):
    return "usuario nao encontrado"  # ⚠⚠
if not senha_ok(login, senha):
    return "senha incorreta"         # ⚠⚠ enumera usuário

# ── padrão 4: erro de decifração propagado ──
try:
    pt = decifra(ct)
except Exception as e:
    return str(e)                    # ⚠⚠ vaza a exceção interna
```

⚠ **O padrão 3 é o mais frequente em aplicação web**, e é **enumeração de usuário**. **A correção
é a mensagem genérica** — "credenciais inválidas" para os dois casos.

⚠ **E o padrão 1 é o que produz padding oracle**, como o módulo 3 mostrou. **A correção é AEAD**
(elimina a superfície) **ou** verificar antes de decifrar **ou** erro uniforme.

```bash
mkdir -p ~/crypto-lab/mod07 && cd ~/crypto-lab/mod07

echo "═══ 1. oráculo de tempo — o mais sutil ═══"
python3 - <<'PY'
import time, secrets, statistics

def compara_oraculo(a: bytes, b: bytes) -> bool:
    """⚠ vaza por tempo: para no primeiro diferente"""
    if len(a) != len(b): return False
    for x, y in zip(a, b):
        if x != y: return False
    return True

def compara_ok(a: bytes, b: bytes) -> bool:
    import hmac
    return hmac.compare_digest(a, b)

def mede(f, n=3000):
    ts = []
    for _ in range(n):
        t0 = time.perf_counter_ns()
        f()
        ts.append(time.perf_counter_ns() - t0)
    return statistics.median(ts)

segredo = secrets.token_bytes(32)

print("  ── vazamento por número de bytes corretos ──")
print()
print(f"  {'certos':>7}  {'oráculo':>10}  {'constante':>11}  {'razão':>8}")
print("  " + "-"*44)

base = None
for acertos in [0, 8, 16, 24, 31, 32]:
    if acertos < 32:
        p = segredo[:acertos] + bytes([segredo[acertos] ^ 0xFF]) + b"\x00" * (31 - acertos)
    else:
        p = segredo
    t_o = mede(lambda: compara_oraculo(p, segredo))
    t_c = mede(lambda: compara_ok(p, segredo))
    if base is None: base = t_o
    print(f"  {acertos:>7}  {t_o:>8} ns  {t_c:>9} ns  {t_o/base:>7.2f}x")

print()
print("  ⚠ a coluna 'oráculo' CRESCE de forma mensurável")
print("     e o crescimento revela quantos bytes estão certos")
print("  ✓ a coluna 'constante' é plana")
print()
print("═══ o ataque em etapas ═══")
print()
print("  para cada byte, o atacante testa 256 valores e mede o tempo.")
print("  o valor que TARDA MAIS é o correto — porque a comparação avança.")
print()
print(f"  segredo de 32 bytes:")
print(f"    sem oráculo : 2^256 = {2**256:.3e} tentativas")
print(f"    com oráculo : 32 × 256 = {32*256} tentativas")
print(f"    ⚠ redução   : {2**256/(32*256):.3e}×")
PY
```

⚠ **A tabela de tempos é a prova.** E a redução de **2^256 para 8192** é o número que fecha o
argumento — **é a diferença entre matematicamente impossível e trivial.**

⚠ **E a lição sobre detecção:** **nenhuma ferramenta acha isso.** Não há erro, não há log, não há
crash. **Há uma diferença de nanossegundos** — e a auditoria exige **medir**, ou **ler a comparação**.

**Produza `oraculo.md`:**

| Bytes certos | Tempo (oráculo) | Tempo (constante) | Razão |
|---|---|---|---|
| 0 | | | |
| 16 | | | |
| 32 | | | |

**Responda:**

1. **A coluna do oráculo cresce?** O que isso vaza?
2. **Quantas tentativas** com e sem o oráculo?
3. **Nenhuma ferramenta acha isso.** Por quê?
4. **Como você detectaria** por leitura de código?

---

## 7.3 Classe 2 — Nonce/IV reusado

⚠ **O reconhecimento: esquema determinístico onde deveria ser variável.**

| Padrão no código | Classe | Falha |
|---|---|---|
| `nonce = 0` | **constante** | Reuso total |
| `nonce = counter` sem persistir | **repete após reboot** | Reuso |
| `iv = timestamp` | **previsível** | CBC: entrada controlada |
| `iv = hash(mensagem)` | **determinístico** | Mesma msg → mesmo IV |
| `iv = secrets.randbelow(2**32)` | **espaço pequeno** | Colisão após ~2^16 |
| `nonce = bytes(12)` | **zeros** | Reuso total |
| `k = 12345` (ECDSA) | **constante** | ⚠ Chave privada recuperada |
| `random.bytes(12)` | **PRNG fraco** | Classe 3 também |

⚠ **O único padrão seguro é `secrets.token_bytes(12)`** (ou contador **persistente** com escrita
atômica, do módulo 2).

⚠ **E o espaço pequeno é sutil.** Um nonce de **32 bits** parece aleatório — mas com o **paradoxo do
aniversário**, a colisão aparece com **~2^16 = 65.536 mensagens**. **Para GCM, isso é catastrófico**
— e um servidor de alto volume **atinge isso em minutos**.

```bash
echo "═══ 2. reuso de nonce — e o paradoxo do aniversário ═══"
python3 - <<'PY'
import secrets, math, hashlib

print("═══ espaço do nonce × risco de colisão ═══")
print()
print(f"  {'bits':>5}  {'mensagens p/ 50%':>18}  {'mensagens p/ 1%':>16}  avaliação")
print("  " + "-"*62)

for bits in [16, 24, 32, 48, 64, 96]:
    n50 = int(1.1774 * 2**(bits/2))      # sqrt(2*ln2*2^n)
    n01 = int(0.1414 * 2**(bits/2))
    if bits < 32:
        av = "⚠ TRIVIAL colidir"
    elif bits < 64:
        av = "⚠ colide em volume alto"
    else:
        av = "✓ seguro"
    print(f"  {bits:>5}  {n50:>18,}  {n01:>16,}  {av}")

print()
print("  ⚠ 96 bits (o recomendado no GCM) → colisão após ~2^48 mensagens")
print("     é inviável. Por isso o GCM usa nonce de 96 bits.")
print()
print("  ⚠ 32 bits → colisão com ~77.000 mensagens")
print("     um servidor que cifra 1000/s chega lá em 77 segundos.")
print()

print("═══ simulando com espaço pequeno ═══")
for bits in [16, 24, 32]:
    espaco = 2**bits
    vistos = set()
    n = 0
    limite = 200_000
    while n < limite:
        v = secrets.randbelow(espaco)
        if v in vistos:
            break
        vistos.add(v)
        n += 1
    teorico = int(1.1774 * 2**(bits/2))
    print(f"  {bits} bits: colisão após {n:,} mensagens  (teórico 50%: {teorico:,})")

print()
print("═══ e o que a colisão causa ═══")
print()
print("  ┌────────────┬──────────────────────────────────────┐")
print("  │ esquema    │ efeito do reuso                      │")
print("  ├────────────┼──────────────────────────────────────┤")
print("  │ AES-CTR    │ C1 ⊕ C2 = P1 ⊕ P2  (sem chave)       │")
print("  │ ChaCha20   │ idem                                  │")
print("  │ AES-GCM    │ ⚠ H recuperável → forjar mensagem     │")
print("  │ CBC        │ IV previsível → entrada controlada    │")
print("  │ ECDSA/DSA  │ ⚠ CHAVE PRIVADA recuperada            │")
print("  └────────────┴──────────────────────────────────────┘")
PY
```

⚠ **A primeira tabela é o instrumento de dimensionamento.** Um nonce de **32 bits** colide em
**77.000 mensagens** — e um servidor de alto volume chega lá **em segundos**. **Um nonce de 96 bits
colide após 2^48 mensagens — inviável.** **É por isso que o GCM usa 96.**

⚠ **E a simulação confirma a teoria do aniversário.** O número medido bate com o teórico — **o que
mostra que o risco é previsível, não hipotético.**

**Produza `nonce-reuso.md`:**

| Bits do nonce | Mensagens p/ 50% | Avaliação |
|---|---|---|
| 16 | | |
| 24 | | |
| 32 | | |
| 96 | | |

**Responda:**

1. **Um nonce de 32 bits é seguro?** Quantas mensagens até colidir?
2. Por que o GCM usa **96 bits**?
3. Qual esquema é o pior com nonce repetido? Por quê?
4. **Como você detecta** reuso de nonce por leitura?

---

## 7.4 Classe 3 — Entropia fraca

⚠ **Já coberto no módulo 2 — aqui o foco é o reconhecimento em código.**

| Padrão | Linguagem | Falha |
|---|---|---|
| `rand()`, `srand(time(NULL))` | C | Mersenne/tempo |
| `Math.random()` | JS | PRNG não cripto |
| `random.random()`, `random.choice()` | Python | Mersenne |
| `$RANDOM` | shell | 15 bits |
| `mt_rand()`, `rand()` | PHP | PRNG não cripto |
| `new Random()` | Java | PRNG não cripto |
| `uuid1()` | Python | MAC + timestamp |
| `time()`, `getpid()` como semente | qualquer | 2 bits |
| `/dev/random` (bloqueante) | shell/C | Não é mais seguro, é lento |

⚠ **E o padrão correto, por linguagem, do módulo 2:**

| Linguagem | ✓ Use |
|---|---|
| Python | `secrets.token_bytes(32)` |
| JS/Node | `crypto.randomBytes(32)` |
| C | `getrandom(buf, 32, 0)` |
| Go | `crypto/rand.Read` |
| Java | `new SecureRandom()` |
| PHP | `random_bytes(32)` |
| Shell | `head -c 32 /dev/urandom` |

**Produza `entropia-fraca.md`:**

| Padrão | Linguagem | Correção |
|---|---|---|
| | | |
| | | |

**Responda:**

1. Qual padrão fraco você **já viu** em código real?
2. **Por que `$RANDOM` é 15 bits?**
3. Por que `uuid1` é ruim para segurança?
4. **Qual o `grep`** para achar as cinco linguagens de uma vez?

---

## 7.5 Classe 4 — Validação ausente

⚠ **A classe mais frequente em aplicação web, e a mais fácil de achar.**

| Padrão | O que falta validar | Severidade |
|---|---|---|
| `verify=False` | Cadeia do certificado | ⚠ **Alta** |
| `InsecureSkipVerify` | Idem | ⚠ Alta |
| `alg` lido do token JWT | Algoritmo fixado no servidor | ⚠ **Crítica** |
| `==` em segredo | Tempo constante | Média-alta |
| `decode` sem `verify` (JWT) | Assinatura | ⚠ **Crítica** |
| `jwt.decode(..., options={"verify_signature": False})` | Assinatura | ⚠ Crítica |
| Token sem campo de `expiração` | Validade | Alta |
| `AAD` não usado | Contexto amarrado | Média |
| Cadeia não verificada no cliente | MITM | ⚠ Alta |
| Assinatura verificada **depois** de usar o dado | Ordem | Alta |

⚠ **A linha do JWT `alg` é a mais perigosa**, porque combina **duas** falhas:

| Ataque | Como |
|---|---|
| **`alg: none`** | Servidor aceita token sem assinatura |
| **Confusão RS256 → HS256** | Atacante assina com a **pública** como secreto HMAC |
| **`kid` injection** | Atacante aponta o `kid` para caminho que controla |
| **Algoritmo não fixado** | Servidor usa o que o token diz |

⚠ **A confusão RS256→HS256 é a mais engenhosa.** O servidor **espera** RS256 (assimétrico) e usa a
**pública** para verificar. O atacante muda o `alg` para **HS256** (simétrico) — e **assina com a
chave pública**, que ele **conhece**. **O servidor usa a pública como chave HMAC — e valida.**

⚠ **A defesa é uma linha:** **fixar o algoritmo no código**, nunca ler do token.

```bash
echo "═══ 3. JWT — as quatro falhas ═══"
python3 - <<'PY'
import hmac, hashlib, base64, json

def b64u(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
def b64d(s):
    s += "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s)

def jwt(cab, pay, segredo=None, alg="HS256"):
    h = b64u(json.dumps(cab, separators=(',',':')).encode())
    p = b64u(json.dumps(pay, separators=(',',':')).encode())
    msg = f"{h}.{p}".encode()
    if alg == "none":
        s = ""
    elif alg == "HS256":
        s = b64u(hmac.new(segredo, msg, hashlib.sha256).digest())
    else:
        s = "assinatura-rsa"
    return f"{h}.{p}.{s}"

segredo = b"segredo-do-servidor"

print("═══ FALHA 1: alg=none ═══")
tok = jwt({"alg":"none","typ":"JWT"}, {"user":1,"role":"admin"}, alg="none")
print(f"  token: {tok[:70]}...")
print("  ⚠ se o servidor LÊ o alg do cabeçalho e aceita 'none':")
print("     este token passa SEM assinatura.")

print()
print("═══ FALHA 2: o servidor não fixa o algoritmo ═══")
print()
print("  O servidor espera RS256 (assimétrico) e usa a PÚBLICA para verificar.")
print("  O atacante:")
print("    1. muda o alg para HS256 (simétrico)")
print("    2. assina usando a CHAVE PÚBLICA como segredo HMAC")
print("    3. ⚠ a pública é PÚBLICA — ele conhece")
print()
print("  O servidor, que não fixou o algoritmo, usa a pública como")
print("  chave HMAC — e a assinatura CONFERE.")
print()

print("═══ FALHA 3: verify=False ═══")
print("  jwt.decode(token, options={'verify_signature': False})")
print("  ⚠ decodifica e não verifica — o payload é lido como verdadeiro")

print()
print("═══ FALHA 4: sem expiração ═══")
tok = jwt({"alg":"HS256"}, {"user":1,"role":"admin"}, segredo)
print(f"  token sem 'exp': {tok[:60]}...")
print("  ⚠ válido para SEMPRE — vazamento em 2019 vale em 2026")

print()
print("═══ A CORREÇÃO ═══")
print()
print("  # PyJWT — ✓ correto")
print("  jwt.decode(")
print("      token,")
print("      chave,")
print("      algorithms=['RS256'],        # ⚠ FIXO. nunca do token.")
print("      options={'require': ['exp', 'iat', 'nbf']},  # ⚠ campos obrigatórios")
print("  )")
print()
print("  ⚠ e validar os CAMPOS também (módulo 1):")
print("     o servidor confere 'role' contra o banco,")
print("     não confia no valor que veio no token.")
PY
```

⚠ **A saída tem as quatro falhas — e a correção em quatro linhas.** **A linha do `algorithms=[...]`**
é a defesa contra a falha 2 — e é a **única** que impede a confusão de algoritmo.

⚠ **E a linha dos `options={'require': [...]}`** resolve a falha 4 — **campo obrigatório**. **Sem
ela, um token sem `exp` é aceito como válido para sempre.**

**Produza `validacao.md`:**

| Falha | Padrão no código | Severidade | Correção |
|---|---|---|---|
| `alg: none` | | | |
| Confusão RS256→HS256 | | | |
| `verify_signature: False` | | | |
| Sem expiração | | | |

**Responda:**

1. **Por que a confusão RS256→HS256 funciona?** O que o atacante usa como chave?
2. **Qual a correção de uma linha** para ela?
3. **Por que validar os campos** e não só a assinatura (módulo 1)?
4. **Qual das quatro é a mais grave?** Por quê?

---

## 7.6 Classe 5 — Protocolo

⚠ **A classe sem padrão local. O código de cada lado está certo — a interação falha.**

| Falha de protocolo | O que permite | Detecção |
|---|---|---|
| **Downgrade** | Negociar versão antiga | Testar versão antiga |
| **Compressão** | CRIME — vaza por tamanho | Ver se compressão está ligada |
| **Renegociação** | Injeção no handshake | Ver se renegociação é permitida |
| **Sessão longa** | Forward secrecy enfraquece | Ver tickets |
| **0-RTT** | Replay | Ver se está habilitado |
| **Cross-protocol** | DROWN (SSLv2 + TLS mesma chave) | Ver protocolos aceitos |
| **RSA key transport** | Sem forward secrecy | Ver lista de cifras |
| **Sem HSTS** | Downgrade por rede | Ver cabeçalho |
| **Sem CT** | Certificado não auditável | Ver SCT |
| **Revogação não checável** | Certificado roubado vale | Ver OCSP/CRL |

⚠ **A linha do **DROWN** é a mais didática da classe.** O servidor tinha TLS 1.2 **correto** — mas
**aceitava SSLv2 na mesma chave**. E o SSLv2 tinha falha que permitia **decifrar o TLS 1.2**. **O
protocolo velho derrubou o novo.**

⚠ **A lição escrita:**

> **Na classe 5, o elo mais fraco define a segurança do conjunto. Não adianta o TLS 1.3 estar
> correto se o servidor ainda aceita SSLv3.**

⚠ **E é por isso que a detecção é por **varredura**, não por leitura de código.** Você precisa
**testar** o que o servidor aceita — porque o código pode ter **uma flag a mais** que ninguém
lembra.

```bash
echo "═══ 4. a classe 5 — o que testar ═══"
echo
cat <<'EXPL'
  ── o teste de protocolo ──
    for proto in ssl3 tls1 tls1_1 tls1_2 tls1_3; do
      echo | openssl s_client -connect host:443 -$proto 2>&1 | grep -E 'Protocol|alert'
    done
    ⚠ qualquer resposta em ssl3/tls1/tls1_1 é achado

  ── o teste de cifra ──
    for c in NULL aNULL eNULL EXPORT DES RC4 3DES ADH; do
      echo | openssl s_client -connect host:443 -cipher $c 2>&1 | grep 'Cipher is'
    done
    ⚠ qualquer sucesso é achado

  ── compressão ──
    echo | openssl s_client -connect host:443 2>&1 | grep 'Compression'
    ⚠ 'zlib' significa CRIME possível

  ── renegociação ──
    # openssl 1.1+: -legacy_renegotiation
    ⚠ renegociação cliente é achado

  ── HSTS ──
    curl -sI https://host/ | grep -i strict-transport
    ⚠ ausência permite downgrade

  ── 0-RTT ──
    # no servidor: ssl_early_data
    ⚠ se aceita POST em 0-RTT, é replay
EXPL
```

⚠ **A lista é o instrumento da classe 5.** Cada linha testa **um aspecto da negociação** — e
**nenhuma delas é visível no código da aplicação**. **É a razão de a classe 5 exigir teste, não
leitura.**

**Produza `protocolo.md`:**

| Aspecto | Teste | Resultado no seu servidor |
|---|---|---|
| Protocolos antigos | | |
| Cifra anônima | | |
| Compressão | | |
| HSTS | | |
| 0-RTT | | |

**Responda:**

1. **Por que o DROWN é didático?** O que derrubou o quê?
2. **Por que a classe 5 não tem padrão local?**
3. Como você testa cada aspecto?
4. **Qual é a lição escrita** da classe 5?

---

## 7.7 A tabela de reconhecimento

⚠ **O entregável do módulo. Preencha com o padrão que você **viu**, não com definição.**

| # | Classe | Padrão no código | Aviso do linter | Ferramenta | Antídoto |
|---|---|---|---|---|---|
| 1 | Oracle | | ✗ nenhum | **nenhuma** | |
| 2 | Nonce/IV | | ✗ nenhum | **nenhuma** | |
| 3 | Entropia | | parcial | `grep` | |
| 4 | Validação | | parcial | `grep` | |
| 5 | Protocolo | | ✗ nenhum | **scanner de config** | |

⚠ **A coluna "aviso do linter" conta a história:** **nenhuma classe tem aviso automático completo.**
**Bandit, ESLint, Semgrep** pegam **parte** da classe 3 e **parte** da 4. **Classe 1, 2 e 5 exigem
método humano.**

⚠ **E é por isso que a tabela vale mais que a lista.** Ela diz **qual instrumento usar** em cada
caso — e **quando o instrumento é você**.

---

## 7.8 LAB — As cinco classes, num alvo

**Duração:** 150 min

### Passo 1 — Reconhecimento por leitura (45 min)

⚠ **O alvo esconde as cinco classes. Ache por **leitura** antes de rodar.**

```bash
cd ~/crypto-lab/mod07

cat > alvo-falho.py <<'PY'
#!/usr/bin/env python3
"""
⚠ ALVO DIDÁTICO — contém falhas deliberadas das cinco classes.
   Encontre cada uma por LEITURA antes de executar.
   É código SEU, no SEU laboratório.
"""
import os, time, random, hashlib, hmac, base64, json, secrets
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

# ── (A) configuração global ──
SEGREDO_JWT = b"segredo123"
CHAVE_AES = b"0123456789abcdef"

def gera_token_sessao():
    """(B) gera token de sessão"""
    return "".join(random.choice("0123456789abcdef") for _ in range(32))

def gera_nonce():
    """(C) gera nonce para o AEAD"""
    return b"\x00" * 12

def cifra(dado: bytes):
    """(D) cifra com AEAD"""
    nonce = gera_nonce()
    c = AES.new(CHAVE_AES, AES.MODE_GCM, nonce=nonce)
    ct, tag = c.encrypt_and_digest(dado)
    return nonce + tag + ct

def decifra(pacote: bytes):
    """(E) decifra e valida"""
    nonce, tag, ct = pacote[:12], pacote[12:28], pacote[28:]
    c = AES.new(CHAVE_AES, AES.MODE_GCM, nonce=nonce)
    try:
        return c.decrypt_and_verify(ct, tag)
    except ValueError as e:
        raise ValueError(f"falha na decifracao: {e}")   # (F)

def mac_mensagem(msg: bytes):
    """(G) autentica mensagem"""
    return hashlib.sha256(CHAVE_AES + msg).hexdigest()

def verifica_mac(msg: bytes, tag: str) -> bool:
    """(H) verifica a tag"""
    return mac_mensagem(msg) == tag

def login(usuario: str, senha: str) -> str:
    """(I) autentica usuário"""
    db = {"admin": "hash1", "ana": "hash2"}
    if usuario not in db:
        return "usuario nao encontrado"        # (J)
    if db[usuario] != senha:
        return "senha incorreta"               # (K)
    return "ok"

def valida_jwt(token: str) -> dict:
    """(L) valida token JWT"""
    cab, pay, _ = token.split(".")
    cabecalho = json.loads(base64.urlsafe_b64decode(cab + "=="))
    payload = json.loads(base64.urlsafe_b64decode(pay + "=="))
    if cabecalho["alg"] == "HS256":            # (M)
        # verifica
        partes = token.rsplit(".", 1)[0]
        esperado = base64.urlsafe_b64encode(
            hmac.new(SEGREDO_JWT, partes.encode(), hashlib.sha256).digest()
        ).rstrip(b"=").decode()
        if token.rsplit(".", 1)[1] != esperado:
            raise ValueError("assinatura invalida")
    return payload

def deriva_chave_sessao():
    """(N) deriva chave de sessão"""
    return hashlib.sha256(str(int(time.time())).encode()).digest()[:16]

if __name__ == "__main__":
    print("⚠ alvo didático — não executar sem ter feito o exercício de leitura")
PY
```

⚠ **Antes de rodar, preencha `reconhecimento.md`:**

| Marcador | Classe | O padrão | Por que é falha |
|---|---|---|---|
| A | | | |
| B | | | |
| C | | | |
| D | | | |
| E | | | |
| F | | | |
| G | | | |
| H | | | |
| I | | | |
| J | | | |
| K | | | |
| L | | | |
| M | | | |
| N | | | |

⚠ **O gabarito (só leia depois de preencher):**

| Marcador | Classe | A falha |
|---|---|---|
| **A** | 4 | `SEGREDO_JWT` e `CHAVE_AES` **no código** — módulo 4, erro 1 |
| **B** | **3** | `random.choice` — **Mersenne Twister**, não CSPRNG |
| **C** | **2** | `b"\x00"*12` — **nonce constante**, reuso total |
| **D** | 2 | usa `gera_nonce()` → **todos os cyphertexts com o mesmo nonce** |
| **E** | — | a função está certa; a falha vem do **D** |
| **F** | **1** | `f"falha na decifracao: {e}"` — **erro distinguível** = oráculo |
| **G** | **4** | `sha256(CHAVE_AES + msg)` — **extensão de comprimento** — módulo 5 |
| **H** | **1** | `==` — **oráculo de tempo** |
| **I** | — | a função tem as falhas em J e K |
| **J** | **1** | `"usuario nao encontrado"` — **enumeração de usuário** |
| **K** | **1** | `"senha incorreta"` — idem |
| **L** | — | a função tem a falha em M |
| **M** | **4** | **`alg` lido do token** — e aceita qualquer algoritmo que não seja HS256 (incluindo `none`, que pula a verificação!) |
| **N** | **3** | `sha256(str(int(time.time())))` — **semente = relógio** |

⚠ **A classe 5 não está no alvo.** Ela é de **protocolo** — exige servidor e negociação. **Encontrar
o que NÃO está é tão importante quanto encontrar o que está.** E o gabarito da classe 5 é
**verificar se o alvo tem servidor TLS** — não tem.

**Responda:**

1. **Quantas das cinco classes você achou?** Quais errou?
2. **Qual classe não está** no alvo? Por quê?
3. **Qual falha é a mais grave?** Por quê?
4. Quantos marcadores você **não** identificou?

### Passo 2 — Confirme cada uma (50 min)

```bash
cd ~/crypto-lab/mod07

cat > confirma-falhas.py <<'PY'
#!/usr/bin/env python3
"""confirma-falhas.py — confirma cada classe, com a saída real."""
import os, time, random, hashlib, hmac, base64, json, secrets
from Crypto.Cipher import AES
from collections import Counter

print("═══════════ CONFIRMAÇÃO DAS CINCO CLASSES ═══════════")
print()

# ═══════════════════════════════════════════════
print("── CLASSE 2: nonce CONSTANTE ──")
print()
CHAVE = b"0123456789abcdef"
def gera_nonce_ruim(): return b"\x00" * 12

p1 = b"mensagem secreta A"
p2 = b"mensagem secreta B"

n = gera_nonce_ruim()
c1 = AES.new(CHAVE, AES.MODE_GCM, nonce=n)
ct1, t1 = c1.encrypt_and_digest(p1)
c2 = AES.new(CHAVE, AES.MODE_GCM, nonce=n)
ct2, t2 = c2.encrypt_and_digest(p2)

x = bytes(a ^ b for a, b in zip(ct1, ct2))
esperado = bytes(a ^ b for a, b in zip(p1, p2))
print(f"  nonce usado nas duas: {n.hex()}")
print(f"  C1 ⊕ C2  = {x.hex()}")
print(f"  P1 ⊕ P2  = {esperado.hex()}")
print(f"  ⚠ iguais? {x == esperado}   → vazou sem a chave")
print()

# ═══════════════════════════════════════════════
print("── CLASSE 3: semente de tempo, e random fraco ──")
print()
random.seed(int(time.time()))
t1 = "".join(random.choice("0123456789abcdef") for _ in range(16))
agora = int(time.time())
achou = None
for off in range(-5, 6):
    random.seed(agora + off)
    cand = "".join(random.choice("0123456789abcdef") for _ in range(16))
    if cand == t1:
        achou = off
        break
print(f"  token gerado   : {t1}")
print(f"  semente achada : offset {achou:+d} s do relógio")
print(f"  ⚠ reproduzido em {abs(achou)*2+1 if achou is not None else '?'} tentativas")
print()

# ═══════════════════════════════════════════════
print("── CLASSE 1: oráculo de erro ──")
print()
def servidor_oraculo(pacote):
    nonce, tag, ct = pacote[:12], pacote[12:28], pacote[28:]
    c = AES.new(CHAVE, AES.MODE_GCM, nonce=nonce)
    try:
        return "ok:" + c.decrypt_and_verify(ct, tag).decode()
    except ValueError as e:
        return f"ERRO: {e}"      # ⚠ distinguível

n = secrets.token_bytes(12)
c = AES.new(CHAVE, AES.MODE_GCM, nonce=n)
ct, tag = c.encrypt_and_digest(b"admin=true")
pac = n + tag + ct

print("  pacote válido:")
print(f"    {servidor_oraculo(pac)}")
print()
pac_bad = pac[:12] + pac[12:28] + bytes([pac[28] ^ 1]) + pac[29:]
print("  pacote alterado:")
print(f"    {servidor_oraculo(pac_bad)}")
print()
print("  ⚠ as duas respostas são DIFERENTES = oráculo")
print("  ⚠ e a mensagem diferencia 'tag inválida' de 'outra coisa'")
print()

# ═══════════════════════════════════════════════
print("── CLASSE 4: MAC com extensão, e comparação ──")
print()
def mac_ruim(k, msg): return hashlib.sha256(k + msg).hexdigest()
def mac_ok(k, msg):   return hmac.new(k, msg, hashlib.sha256).hexdigest()

k = secrets.token_bytes(32)
msg = b"user=ana&role=user"
print(f"  sha256(k + msg)     : {mac_ruim(k, msg)[:40]}...")
print(f"  hmac.new(k, msg)    : {mac_ok(k, msg)[:40]}...")
print("  ⚠ o primeiro sofre extensão de comprimento (módulo 5)")
print("  ✓ o segundo não")
print()

# comparação
def cmp_ruim(a, b):
    if len(a) != len(b): return False
    for x, y in zip(a, b):
        if x != y: return False
    return True

seg = secrets.token_bytes(32)
def mede(f, n=2000):
    t0 = time.perf_counter_ns()
    for _ in range(n): f()
    return (time.perf_counter_ns() - t0) / n

for acertos in [0, 16, 31]:
    p = seg[:acertos] + bytes([seg[acertos] ^ 1]) + b"\x00" * (31 - acertos)
    tr = mede(lambda: cmp_ruim(p, seg))
    to = mede(lambda: hmac.compare_digest(p, seg))
    print(f"  {acertos:>3} bytes certos: == {tr:>7.0f} ns   compare_digest {to:>7.0f} ns")
print("  ⚠ a linha do '==' cresce → oráculo de tempo")
print()

# ═══════════════════════════════════════════════
print("── CLASSE 4: JWT sem fixar algoritmo ──")
print()
def b64u(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
def valida_ruim(token):
    cab, pay, assin = token.split(".")
    cabecalho = json.loads(base64.urlsafe_b64decode(cab + "=="))
    if cabecalho["alg"] == "HS256":
        partes = token.rsplit(".", 1)[0]
        esperado = b64u(hmac.new(b"segredo123", partes.encode(), hashlib.sha256).digest())
        if assin != esperado:
            raise ValueError("assinatura invalida")
    # ⚠ se alg != HS256, NÃO verifica
    return json.loads(base64.urlsafe_b64decode(pay + "=="))

forjado = (b64u(b'{"alg":"none","typ":"JWT"}') + "." +
           b64u(json.dumps({"user":1,"role":"admin"},separators=(',',':')).encode()) + ".")
print(f"  token forjado (alg=none): {forjado[:60]}...")
try:
    r = valida_ruim(forjado)
    print(f"  ⚠⚠ ACEITO: {r}")
    print("     o atacante é admin, SEM assinatura")
except Exception as e:
    print(f"  ✓ rejeitado: {e}")
print()

# ═══════════════════════════════════════════════
print("── CLASSE 1: enumeração de usuário ──")
print()
def login_ruim(u, s):
    db = {"admin": "h1", "ana": "h2"}
    if u not in db: return "usuario nao encontrado"
    if db[u] != s:  return "senha incorreta"
    return "ok"

for u in ["admin", "ana", "inexistente"]:
    print(f"  login('{u}', 'x') → {login_ruim(u, 'x')}")
print("  ⚠ as respostas distinguem usuário existente de inexistente")
print("  ⚠ o atacante enumera a base de usuários")

print()
print("═══════════ RESUMO ═══════════")
print()
print("  classe 1 (oracle)      : erro distinguível, tempo, enumeração")
print("  classe 2 (nonce)       : constante, contador reiniciável")
print("  classe 3 (entropia)    : random/time em vez de CSPRNG")
print("  classe 4 (validação)   : alg do token, sha256(k+msg), ==")
print("  classe 5 (protocolo)   : ⚠ NÃO está neste alvo — exige servidor")
print()
print("  ⚠ e o gabarito da classe 5 é: verificar se há servidor TLS")
print("     e testar a NEGOCIAÇÃO — não o código.")
PY

python3 confirma-falhas.py
```

Produza `confirmacao.md`:

| Classe | Demonstrada? | Precisa da chave? | Severidade |
|---|---|---|---|
| 1 — oracle | | | |
| 2 — nonce | | | |
| 3 — entropia | | | |
| 4 — validação | | | |
| 5 — protocolo | | | |

**Responda:**

1. **Qual classe você confirmou com mais clareza?**
2. Qual **não** está no alvo? **Por que?**
3. **Qual falha exige apenas uma linha** para corrigir?
4. **Qual delas nenhuma ferramenta pega?**

### Passo 3 — A correção (55 min)

```bash
cd ~/crypto-lab/mod07

cat > alvo-corrigido.py <<'PY'
#!/usr/bin/env python3
"""
✓ ALVO CORRIGIDO — as cinco classes resolvidas.
   Compare com alvo-falho.py, marcador por marcador.
"""
import os, time, random, hashlib, hmac, base64, json, secrets
from Crypto.Cipher import AES
from collections import Counter

# ── (A) ✓ segredo do ambiente, chave derivada ──
def hkdf(ikm, salt, info, length=32):
    prk = hmac.new(salt or b"\x00"*32, ikm, hashlib.sha256).digest()
    out, t, i = b"", b"", 1
    while len(out) < length:
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        out += t; i += 1
    return out[:length]

def carrega_segredo(nome, minimo=32):
    """
    ✓ segredo de KMS/env, NUNCA do código.
    ⚠ em produção: AWS Secrets Manager, Vault, ou KMS.
    """
    v = os.environ.get(nome)
    if not v:
        raise RuntimeError(f"{nome} nao definido — use um cofre")
    b = v.encode()
    if len(b) < minimo:
        raise RuntimeError(f"{nome} curto demais")
    return b

# para o laboratório, geramos e injetamos como se viesse do cofre
_SEMENTE_MESTRA = secrets.token_bytes(32)
K_ENC = hkdf(_SEMENTE_MESTRA, b"lab"*8, b"app/v1/encryption")
K_MAC = hkdf(_SEMENTE_MESTRA, b"lab"*8, b"app/v1/authentication")
K_JWT = hkdf(_SEMENTE_MESTRA, b"lab"*8, b"app/v1/jwt")

# ── (B) ✓ CSPRNG ──
def gera_token_sessao(nbytes=32):
    return secrets.token_urlsafe(nbytes)

# ── (C) ✓ nonce ALEATÓRIO por mensagem ──
def gera_nonce():
    return secrets.token_bytes(12)

# ── (D) ✓ AEAD com nonce novo E versão de chave ──
VERSAO_CHAVE = 1
def cifra(dado: bytes, aad: bytes = b""):
    nonce = gera_nonce()
    c = AES.new(K_ENC, AES.MODE_GCM, nonce=nonce)
    if aad: c.update(aad)
    ct, tag = c.encrypt_and_digest(dado)
    return bytes([VERSAO_CHAVE]) + nonce + tag + ct

# ── (E)+(F) ✓ erro UNIFORME ──
class FalhaDecifracao(Exception):
    """✓ uma exceção só, sem detalhe interno."""
    pass

def decifra(pacote: bytes, aad: bytes = b""):
    if len(pacote) < 29: raise FalhaDecifracao()
    nonce, tag, ct = pacote[1:13], pacote[13:29], pacote[29:]
    c = AES.new(K_ENC, AES.MODE_GCM, nonce=nonce)
    if aad: c.update(aad)
    try:
        return c.decrypt_and_verify(ct, tag)
    except ValueError:
        raise FalhaDecifracao()      # ✓ MESMA exceção, sem vazar o motivo

# ── (G) ✓ HMAC, com contexto ──
def mac_mensagem(msg: bytes, contexto: bytes = b"default"):
    return hmac.new(K_MAC, b"ctx:" + contexto + b"|" + msg, hashlib.sha256).hexdigest()

# ── (H) ✓ comparação em tempo constante ──
def verifica_mac(msg: bytes, tag: str, contexto: bytes = b"default") -> bool:
    return hmac.compare_digest(mac_mensagem(msg, contexto), tag)

# ── (I)+(J)+(K) ✓ resposta UNIFORME + tempo constante ──
def login(usuario: str, senha: str) -> bool:
    """✓ resposta única. NÃO revela se o usuário existe."""
    db = {"admin": "h1", "ana": "h2"}
    h_esperado = db.get(usuario, "h_inexistente_para_igualar_tempo")
    # ⚠ usa o mesmo caminho para os dois casos
    ok = hmac.compare_digest(h_esperado, senha)
    return ok and usuario in db

def mensagem_login(ok: bool) -> str:
    return "credenciais invalidas" if not ok else "ok"   # ✓ UMA mensagem

# ── (L)+(M) ✓ JWT com algoritmo FIXO e campos obrigatórios ──
def valida_jwt(token: str) -> dict:
    ALGORITMOS = ["HS256"]           # ⚠ FIXO no código, nunca do token
    try:
        cab_b64, pay_b64, assin_b64 = token.split(".")
        cabecalho = json.loads(base64.urlsafe_b64decode(cab_b64 + "=="))
        payload = json.loads(base64.urlsafe_b64decode(pay_b64 + "=="))

        # ✓ rejeita algoritmo fora da lista — inclui 'none'
        if cabecalho.get("alg") not in ALGORITMOS:
            raise ValueError("algoritmo nao permitido")

        # ✓ verifica assinatura
        partes = f"{cab_b64}.{pay_b64}"
        esperado = base64.urlsafe_b64encode(
            hmac.new(K_JWT, partes.encode(), hashlib.sha256).digest()
        ).rstrip(b"=").decode()
        if not hmac.compare_digest(assin_b64, esperado):
            raise ValueError("assinatura invalida")

        # ✓ campos obrigatórios
        agora = int(time.time())
        for campo in ("exp", "iat", "sub", "role"):
            if campo not in payload:
                raise ValueError(f"campo {campo} ausente")
        if payload["iat"] > agora + 60:
            raise ValueError("iat no futuro")
        if payload["exp"] < agora:
            raise ValueError("expirado")

        return payload
    except Exception:
        raise ValueError("token invalido")   # ✓ erro uniforme

# ── (N) ✓ derivação com segredo de verdade ──
def deriva_chave_sessao(info: bytes):
    """✓ HKDF sobre segredo forte — nunca sobre o relógio."""
    return hkdf(_SEMENTE_MESTRA, b"lab"*8, info, 16)


if __name__ == "__main__":
    print("═══ ALVO CORRIGIDO ═══")
    print()
    print("── token de sessão (CSPRNG) ──")
    for _ in range(3):
        print(f"   {gera_token_sessao()}")
    print()

    print("── nonce ALEATÓRIO por mensagem ──")
    for _ in range(3):
        print(f"   {gera_nonce().hex()}")
    print()

    print("── cifra e decifra ──")
    pac = cifra(b"admin=true", aad=b"user:1000")
    print(f"   pacote: {pac.hex()[:48]}...")
    print(f"   decifra: {decifra(pac, aad=b'user:1000')}")
    try:
        decifra(pac, aad=b"user:9999")
        print("   ⚠ AAD errado aceito")
    except FalhaDecifracao:
        print("   ✓ AAD errado → erro UNIFORME")
    print()

    print("── MAC com contexto, comparação constante ──")
    t_login = mac_mensagem(b"dado", b"login")
    t_backup = mac_mensagem(b"dado", b"backup")
    print(f"   login : {t_login[:40]}...")
    print(f"   backup: {t_backup[:40]}...")
    print(f"   ⚠ iguais? {t_login == t_backup}")
    print(f"   ✓ contexto separa os usos")
    print()

    print("── login com resposta UNIFORME ──")
    for u, s in [("admin","h1"), ("admin","x"), ("inexistente","x")]:
        print(f"   login('{u}', '{s}') → {mensagem_login(login(u, s))}")
    print("   ⚠ a resposta é a MESMA nos três casos")
    print()

    print("── JWT com algoritmo FIXO ──")
    def b64u(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
    agora = int(time.time())

    # token legítimo
    cab = b64u(b'{"alg":"HS256","typ":"JWT"}')
    pay = b64u(json.dumps({"iat":agora,"exp":agora+3600,"sub":"1","role":"admin"},
                          separators=(',',':')).encode())
    assin = b64u(hmac.new(K_JWT, f"{cab}.{pay}".encode(), hashlib.sha256).digest())
    print(f"   válido      : {valida_jwt(f'{cab}.{pay}.{assin}')}")

    # forjado com alg=none
    forjado = f"{b64u(b'{\"alg\":\"none\"}')}.{pay}."
    try:
        valida_jwt(forjado); print("   ⚠ alg=none ACEITO")
    except ValueError as e:
        print(f"   ✓ alg=none rejeitado: {e}")

    # sem exp
    cab2 = b64u(b'{"alg":"HS256","typ":"JWT"}')
    pay2 = b64u(json.dumps({"iat":agora,"sub":"1","role":"admin"},separators=(',',':')).encode())
    assin2 = b64u(hmac.new(K_JWT, f"{cab2}.{pay2}".encode(), hashlib.sha256).digest())
    try:
        valida_jwt(f"{cab2}.{pay2}.{assin2}"); print("   ⚠ sem 'exp' ACEITO")
    except ValueError as e:
        print(f"   ✓ sem 'exp' rejeitado: {e}")
    print()

    print("── derivação de chave ──")
    print(f"   sessão : {deriva_chave_sessao(b'session').hex()}")
    print(f"   storage: {deriva_chave_sessao(b'storage').hex()}")
    print("   ✓ do segredo, não do relógio")

    print()
    print("═══ TABELA: FALHA → CORREÇÃO ═══")
    print()
    print("  ┌────────────────────────────┬────────────────────────────────┐")
    print("  │ falha                      │ correção                       │")
    print("  ├────────────────────────────┼────────────────────────────────┤")
    print("  │ random.choice (token)      │ secrets.token_urlsafe          │")
    print("  │ nonce = b'\\x00'*12         │ secrets.token_bytes(12)        │")
    print("  │ erro distinguível          │ exceção única, sem detalhe     │")
    print("  │ sha256(k + msg)            │ hmac.new(k, msg, sha256)       │")
    print("  │ == em segredo              │ hmac.compare_digest            │")
    print("  │ 'usuario nao encontrado'   │ 'credenciais invalidas'        │")
    print("  │ alg do token               │ algorithms fixo no código      │")
    print("  │ semente = time()           │ HKDF sobre segredo             │")
    print("  └────────────────────────────┴────────────────────────────────┘")
PY

python3 alvo-corrigido.py
```

⚠ **A comparação entre os dois arquivos é o entregável.** Cada marcador do `alvo-falho.py` tem uma
correção correspondente no `alvo-corrigido.py` — e a tabela final é o mapa.

⚠ **E note o `login` corrigido:** ele usa `hmac.compare_digest` **mesmo quando o usuário não
existe** — comparando contra uma string placeholder. **Isso iguala o tempo dos dois casos** — e é
por isso que a enumeração de usuário morre.

**Produza `correcao.md`:**

| Falha no alvo | Classe | Correção | Verificação |
|---|---|---|---|
| | | | |
| | | | |

**Responda:**

1. **Quantas falhas corrigidas?**
2. Qual correção foi **mais sutil**? Por quê?
3. **O `login` corrigido ainda vaza** alguma coisa?
4. Qual falha **não** foi corrigida (por não estar no alvo)?

### Critérios de aceitação

- `oraculo.md` com a tabela de tempos **medida** e a contagem de tentativas.
- Você explicou por que **nenhuma ferramenta** acha o oráculo de tempo.
- `nonce-reuso.md` com a tabela de bits × mensagens, e a simulação.
- Você explicou por que **32 bits não é seguro** para nonce.
- `entropia-fraca.md` com os padrões e a correção de cada.
- `validacao.md` com as **quatro** falhas de JWT e a correção.
- Você explicou **por que a confusão RS256→HS256 funciona**.
- `protocolo.md` com os **cinco** testes da classe 5.
- Você explicou **por que o DROWN é didático**.
- `reconhecimento.md` preenchido **antes** de rodar, com os 14 marcadores.
- Você identificou **que a classe 5 não está no alvo** e por quê.
- `confirma-falhas.py` rodando, com as **quatro** classes confirmadas.
- `alvo-corrigido.py` rodando, com as correções **verificadas**.
- Você explicou por que o **login corrigido** não enumera usuário.
- A tabela **falha → correção** preenchida.

---

## Avaliação

1. Cite as cinco classes de falha e o que origina cada uma.
2. **Qual classe nenhuma ferramenta pega?** Por quê?
3. **Por que a classe 5 não tem padrão local?** O que ela exige?
4. Descreva o **oráculo de tempo** e por que ele vaza.
5. **Quantas tentativas** o ataque de timing economiza? Mostre a conta.
6. **Por que mensagem de erro específica é oráculo?** Dê dois exemplos.
7. **Por que enumeração de usuário é oráculo?** Qual a correção?
8. **Por que `404` genérico não é prova** de take-over? (Compare com a classe 1.)
9. Por que **nonce de 32 bits não é seguro**? Quantas mensagens até colidir?
10. Qual esquema é o **pior** com nonce repetido, e o que é recuperável?
11. **Por que `SELECT` (Contador persistente) precisa de escrita atômica?**
12. Cite **cinco padrões de entropia fraca** e a correção de cada.
13. Por que `$RANDOM` é **15 bits**?
14. **Por que `sha256(k + msg)` é falha grave?** Qual o ataque?
15. **Por que a confusão RS256→HS256 funciona?** O que o atacante usa como chave?
16. **Qual a correção de uma linha** para `alg: none`?
17. Por que `verify=False` é **achado crítico**?
18. **Por que o DROWN é didático?** O que derrubou o quê?
19. Por que a **classe 5 exige varredura** e não leitura de código?
20. **Qual é a lição escrita** da classe 5?

---

**Próximo:** [Módulo 8 — Ataque em laboratório próprio](modulo-08.md)
