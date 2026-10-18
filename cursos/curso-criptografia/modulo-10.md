# Módulo 10 — Projeto: Revisão de Criptografia

**Carga:** 2 horas
**Pré-requisitos:** Módulos 1 a 9

---

## O objetivo do módulo

**Um entregável:** a revisão de criptografia de um sistema, com achado, classificação, correção e
**prova** de que a correção funciona.

⚠ **E aqui o alvo é diferente dos outros cursos.** Nos cursos de Linux e de Enumeração, o alvo era
uma máquina. **Aqui, o alvo é um sistema de criptografia** — e você escolhe qual:

| Sujeito | Onde | Exemplo |
|---|---|---|
| **1. Seu próprio código** | O que você já escreveu | O `cripto_seguro.py` do módulo 9, antes da correção |
| **2. O laboratório do curso** | `alvo-falho.py` (módulo 7) | Oito falhas plantadas |
| **3. Um projeto aberto** | Repositório público | **Auditoria de leitura** — sem executar |
| **4. Sistema que você opera** | Com autorização | O que você tem direito de revisar |

⚠ **A opção 3 merece a ressalva:** revisar projeto aberto é **leitura de código**, e o resultado é um
**relatório privado** para você — ou uma **divulgação responsável** ao mantenedor. **Nunca** um
teste contra instância de terceiro.

---

## ⚠ Nota de conduta

| Você faz | Você **não** faz |
|---|---|
| Revisa **seu** código | Revisa sistema sem autorização |
| Ataca **sua** chave | Quebra chave de terceiro |
| Roda **seu** servidor | Testa instância em produção |
| Reporta ao mantenedor | Publica falha de terceiro |
| **Lê** repositório público | **Executa** contra serviço público |

⚠ **E a regra específica desta área:** **uma falha de criptografia é global.** Um padding oracle
bem-sucedido contra serviço real **vaza dado de terceiros** — e o crime não distingue "testei" de
"ataquei". **A revisão é de leitura e de laboratório. O teste é contra o seu.**

---

## 10.1 As fases

### Fase 1 — Inventário criptográfico (25 min)

⚠ **Antes de julgar, mapeie. O inventário responde: o que este sistema usa?**

```bash
mkdir -p ~/crypto-lab/projeto && cd ~/crypto-lab/projeto

cat > inventario.sh <<'SCRIPT'
#!/usr/bin/env bash
# inventario.sh — mapeia o uso de criptografia no código
set -uo pipefail
DIR="${1:-$HOME/crypto-lab}"

echo "═══════════ INVENTÁRIO CRIPTOGRÁFICO ═══════════"
echo "diretório: ${DIR}"
echo "data: $(date -Is)"
echo

mapa() {
    local rotulo="$1"; shift
    printf '%s\n' "── ${rotulo} ──"
    for pat in "$@"; do
        n=$(grep -rF "$pat" "$DIR" --include='*.py' --include='*.js' --include='*.c' \
             --include='*.go' --include='*.java' --include='*.php' --include='*.sh' \
             2>/dev/null | wc -l)
        [ "$n" -gt 0 ] && printf '   %-32s %s\n' "$pat" "$n"
    done
    echo
}

mapa "CIFRA SIMÉTRICA" "AES.new" "MODE_ECB" "MODE_CBC" "MODE_GCM" \
     "MODE_CTR" "MODE_CFB" "MODE_OFB" "AESGCM" "ChaCha20" "createCipheriv"

mapa "CIFRA ASSIMÉTRICA" "RSA" "PKCS1_v1_5" "PKCS1_OAEP" "X25519" "ECDH" \
     "ec.generate" "public_encrypt"

mapa "HASH" "sha256" "sha1" "md5" "blake2" "sha3" "createHash"

mapa "MAC" "hmac.new" "hmac.New" "createHmac" "sha256(" "compare_digest"

mapa "KDF" "pbkdf2" "bcrypt" "scrypt" "argon2" "HKDF"

mapa "ASSINATURA" "Ed25519" "ecdsa" "ECDSA" "sign(" "verify("

mapa "ALEATORIEDADE" "os.urandom" "secrets." "getrandom" "random." \
     "Math.random" "rand()" "time()" "\$RANDOM"

mapa "TLS" "ssl.create_default_context" "verify=False" "CERT_NONE" \
     "InsecureSkipVerify" "rejectUnauthorized" "-k " "--insecure"

mapa "TOKEN" "jwt.encode" "jwt.decode" "algorithms" "verify_signature" "alg"

mapa "CHAVE E SEGREDO" "environ" "getenv" "vault" "KMS" "SecretsManager" \
     "key_?version" ".pem" ".env"

echo "── VEREDICTO DO INVENTÁRIO ──"
echo "   ⚠ cada linha acima é um ponto de revisão."
echo "   ⚠ a ausência de uma família também é achado:"
echo "      · nenhum 'compare_digest' + algum MAC → provável comparação insegura"
echo "      · nenhum 'secrets' + algum token  → provável RNG fraco"
echo "      · nenhum 'key_version'             → provável rotação impossível"
SCRIPT

chmod +x inventario.sh
./inventario.sh ~/crypto-lab 2>&1 | tee inventario.txt
```

⚠ **A seção do veredicto é o instrumento de leitura cruzada.** **A ausência de uma família é
achado** — e às vezes o achado mais importante, porque a **falta** de `compare_digest` num sistema
que usa MAC é **presunção** de comparação insegura.

⚠ **É o mesmo princípio do módulo 1 e do módulo 7:** **o que não está no código diz tanto quanto o
que está.**

**Produza `inventario.md`:**

| Família | Encontrado | Achado? |
|---|---|---|
| Cifra simétrica | | |
| Cifra assimétrica | | |
| Hash | | |
| MAC | | |
| KDF | | |
| Assinatura | | |
| Aleatoriedade | | |
| TLS | | |
| Token | | |
| Chave | | |

**Responda:**

1. **Qual família tem o padrão mais suspeito?**
2. **Qual família está ausente** e deveria estar?
3. Quantas ocorrências de `verify=False`/`CERT_NONE`?
4. **Qual linha do inventário você revisaria primeiro?**

---

### Fase 2 — As cinco classes, sistematicamente (35 min)

⚠ **Para cada classe, procure ativamente. Não confie no inventário.**

```bash
cd ~/crypto-lab/projeto

cat > revisa-classes.sh <<'SCRIPT'
#!/usr/bin/env bash
# revisa-classes.sh — procura as cinco classes de falha, uma por uma
set -uo pipefail
DIR="${1:-$HOME/crypto-lab}"

echo "═══════════ AS CINCO CLASSES ═══════════"
echo

echo "── CLASSE 1: ORACLE ──"
echo "   procurando mensagens de erro distinguíveis:"
grep -rEn 'except.*:\s*$' "$DIR" --include='*.py' 2>/dev/null | head -3 | sed 's/^/     /'
grep -rEn 'return.*["\x27](padding|mac|tag|assinatura|invalid)[^"\x27]*["\x27]' \
     "$DIR" --include='*.py' --include='*.js' 2>/dev/null | head -8 | sed 's/^/     ⚠ /'
echo
echo "   procurando comparação que não usa compare_digest:"
grep -rEn '(==|!=)\s*(.*)?(tag|mac|hmac|signature|assinatura|token)' \
     "$DIR" --include='*.py' --include='*.js' 2>/dev/null | \
     grep -v compare_digest | head -8 | sed 's/^/     ⚠ /'
echo
echo "   procurando enumeração de usuário:"
grep -rEn '["\x27](usuario|user|conta).*(nao|not).*(existe|found)' \
     "$DIR" --include='*.py' --include='*.js' 2>/dev/null | head -5 | sed 's/^/     ⚠ /'
echo

echo "── CLASSE 2: NONCE/IV ──"
echo "   procurando nonce constante ou previsível:"
grep -rEn '(nonce|iv)\s*=\s*(b?["\x27])' "$DIR" --include='*.py' --include='*.js' 2>/dev/null | head -8 | sed 's/^/     ⚠ /'
grep -rEn '(nonce|iv)\s*=\s*(time|int\(time|counter|b"\\x00)' "$DIR" --include='*.py' 2>/dev/null | head -5 | sed 's/^/     ⚠ /'
echo "   procurando ECB:"
grep -rFn 'MODE_ECB' "$DIR" 2>/dev/null | head -5 | sed 's/^/     ⚠ /'
echo

echo "── CLASSE 3: ENTROPIA ──"
for pat in 'random.random' 'random.choice' 'random.seed' 'Math.random' \
           'rand()' 'srand' 'mt_rand' 'new Random' 'uuid1' '$RANDOM'; do
    n=$(grep -rF "$pat" "$DIR" 2>/dev/null | wc -l)
    [ "$n" -gt 0 ] && printf '     ⚠ %-18s %s\n' "$pat" "$n"
done
echo

echo "── CLASSE 4: VALIDAÇÃO ──"
for pat in 'verify=False' 'CERT_NONE' 'InsecureSkipVerify' 'rejectUnauthorized' \
           'verify_signature.*False' 'options=.*False'; do
    n=$(grep -rF "$pat" "$DIR" 2>/dev/null | wc -l)
    [ "$n" -gt 0 ] && printf '     ⚠ %-26s %s\n' "$pat" "$n"
done
echo "   procurando MAC mal construído:"
grep -rEn 'hashlib\.(sha|md)[0-9]*\s*\(\s*[^)]*(key|secret|senha)' "$DIR" --include='*.py' 2>/dev/null | head -5 | sed 's/^/     ⚠ /'
echo "   procurando alg do token:"
grep -rEn '\[.alg.\]\s*(==|!=)' "$DIR" --include='*.py' --include='*.js' 2>/dev/null | head -5 | sed 's/^/     ⚠ /'
echo

echo "── CLASSE 5: PROTOCOLO ──"
echo "   ⚠ NÃO é visível no código. Exige teste de configuração:"
echo "     · protocolos aceitos (openssl s_client -ssl3/-tls1)"
echo "     · cifras fracas (nmap --script ssl-enum-ciphers)"
echo "     · HSTS (curl -I | grep strict-transport)"
echo "     · 0-RTT (config do servidor)"
echo

echo "── RESUMO ──"
cat <<'EXPL'
  ⚠ classes 1 e 2: NENHUMA ferramenta pega — só leitura
  ⚠ classe 3 e 4: grep pega parte
  ⚠ classe 5: exige varredura de configuração, não leitura
EXPL
SCRIPT

chmod +x revisa-classes.sh
./revisa-classes.sh ~/crypto-lab 2>&1 | tee classes.txt
```

⚠ **A classe 5 está marcada como "não visível no código" — e isso é o achado.** O script **não
tenta** achar o que não está lá. **Ele diz o que fazer em vez disso.** **É a honestidade do
método.**

**Produza `classes-encontradas.md`:**

| Classe | Achados | Como achou | Ferramenta |
|---|---|---|---|
| 1 — Oracle | | | |
| 2 — Nonce | | | |
| 3 — Entropia | | | |
| 4 — Validação | | | |
| 5 — Protocolo | | | |

**Responda:**

1. **Quantos achados por classe?**
2. **Qual classe nenhum `grep` pegou?**
3. Qual achado é **o mais grave**?
4. **O que você faria** para a classe 5?

---

### Fase 3 — O achado, no formato obrigatório (35 min)

⚠ **Cada achado com a estrutura completa. É o mesmo padrão dos outros cursos, com duas seções
específicas de criptografia.**

```markdown
## Achado N — [título curto]

**Classe**: 1–5
**Classificação**: vulnerabilidade | má configuração | postura
**Primitiva envolvida**: [AES-GCM / HMAC / ECDSA / TLS / RNG]

**Evidência**
```
[o grep ou o comando]

[a saída literal]
```

**Por que importa**
[o mecanismo, em 2–3 frases. NÃO "é inseguro" — POR QUÊ]

**O que o atacante obtém**  ← ⚠ seção obrigatória
[plaintext? chave? forjar mensagem? nada?]

**Custo do ataque**  ← ⚠ seção obrigatória
[consultas, tempo, mensagens necessárias]

**Caminho de exploração** (descrição, sem executar)
[1. ...
 2. ...
 3. ...]

**Correção**
```
[os comandos ou o código]
```

**Verificação da correção**
```
[o comando que prova]
```

**Exige migração de dado?**: sim | não
**Reversão**: [o comando]
**Risco de quebrar**: baixo | médio | alto
```

⚠ **A seção "o que o atacante obtém" é a que separa achado grave de achado irrelevante.** Um `==`
em comparação de **log** não dá nada; o mesmo `==` em comparação de **MAC** dá o segredo. **Sem
essa seção, a severidade é palpite.**

⚠ **E a seção "exige migração de dado" é a que decide a **prioridade**.** Uma correção que muda o
formato **não pode** ser aplicada sem plano — e frequentemente é adiada. **Declarar isso é parte do
relatório.**

**Produza `achados.md`:**

| # | Classe | O que o atacante obtém | Custo | Exige migração? | Risco de quebrar |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |

**Responda:**

1. **Quantos achados no total?**
2. Qual **obtém mais** para o atacante?
3. Quantos **exigem migração**?
4. **Qual você levaria primeiro** ao cliente?

---

### Fase 4 — Correção e prova (25 min)

⚠ **Aplique a correção e **prove** que funciona.**

```bash
cd ~/crypto-lab/projeto

cat > prova-correcao.py <<'PY'
#!/usr/bin/env python3
"""
prova-correcao.py — prova, item por item, que a correção funciona.
⚠ roda no laboratório. Chaves geradas aqui.
"""
import secrets, hmac, hashlib, base64, json, time, statistics
from crypto_seguro import Cofre, Senha, Token, Mac, RNG, compara, FalhaAutenticacao

print("═══════════ PROVA DAS CORREÇÕES ═══════════")
print()

# ── 1. ORACLE DE ERRO: as respostas são idênticas? ──
print("── classe 1: oracle de erro ──")
cofre = Cofre(RNG.chave(32))
p = cofre.cifra(b"token=admin", aad=b"user:1000")
erros = []
for nome, f in [
    ("ct alterado",   lambda: cofre.decifra(p[:-1] + bytes([p[-1]^1]), aad=b"user:1000")),
    ("AAD errado",    lambda: cofre.decifra(p, aad=b"user:9999")),
    ("ct curto",      lambda: cofre.decifra(b"zz", aad=b"")),
    ("magic errado",  lambda: cofre.decifra(b"XX" + p[2:], aad=b"user:1000")),
]:
    try:
        f(); erros.append((nome, "NÃO FALHOU"))
    except FalhaAutenticacao as e:
        erros.append((nome, f"{type(e).__name__}: {e}"))
for n, e in erros:
    print(f"   {n:<14} → {e}")
msg_set = set(e for _, e in erros)
print(f"   ⚠ mensagens distintas: {len(msg_set)}  → {'✓ SEM ORACLE' if len(msg_set)==1 else '⚠ AINDA VAZA'}")
print()

# ── 2. ORACLE DE TEMPO: o tempo é plano? ──
print("── classe 1: oracle de tempo ──")
seg = RNG.chave(32)
def mede(f, n=2000):
    ts = []
    for _ in range(n):
        t0 = time.perf_counter_ns(); f(); ts.append(time.perf_counter_ns() - t0)
    return statistics.median(ts)

ts = []
for acertos in [0, 8, 16, 24, 31]:
    palpite = seg[:acertos] + bytes([seg[acertos] ^ 1]) + b"\x00" * (31 - acertos)
    ts.append(mede(lambda p=palpite: compara(p, seg)))
print(f"   tempos: {[f'{t}ns' for t in ts]}")
variacao = (max(ts) - min(ts)) / statistics.mean(ts) * 100
print(f"   ⚠ variação: {variacao:.1f}%  → {'✓ PLANA' if variacao < 25 else '⚠ ainda vaza'}")
print()

# ── 3. NONCE: dois ct do mesmo dado são diferentes? ──
print("── classe 2: nonce único ──")
a = cofre.cifra(b"mesmo dado"); b = cofre.cifra(b"mesmo dado")
print(f"   ct1: {a.hex()[:32]}...")
print(f"   ct2: {b.hex()[:32]}...")
print(f"   ⚠ iguais? {a == b}  → {'✓ nonce diferente' if a != b else '⚠ NONCE REUSADO'}")
# e o XOR não vaza
x = bytes(p^q for p, q in zip(a[17:], b[17:]))
print(f"   XOR dos ct: {x.hex()[:32]}...  ⚠ não é o XOR dos plaintexts (que seria zeros)")
print()

# ── 4. MAC: extensão não funciona, e o contexto separa ──
print("── classe 4: MAC correto ──")
m = Mac(RNG.chave(32))
ta = m.calcula(b"user=ana", "login")
tb = m.calcula(b"user=ana", "backup")
print(f"   login  : {ta.hex()[:32]}...")
print(f"   backup : {tb.hex()[:32]}...")
print(f"   ⚠ iguais? {ta == tb}  → {'✓ contexto separa' if ta != tb else '⚠ confusão de uso'}")
print(f"   verifica correto : {m.verifica(b'user=ana', ta, 'login')}")
print(f"   verifica errado  : {m.verifica(b'user=ana', ta, 'backup')}")
print()

# ── 5. TOKEN: alg fixo, campos exigidos ──
print("── classe 4: validação de token ──")
t = Token(RNG.chave(32))
tok = t.emite("1000", "leitor")
print(f"   válido      : alg={t.valida(tok)['role']}")
casos = {
    "alg=none": base64.urlsafe_b64encode(b'{"alg":"none"}').rstrip(b"=").decode()
                + "." + tok.split(".")[1] + ".",
    "alg=RS256": base64.urlsafe_b64encode(b'{"alg":"RS256"}').rstrip(b"=").decode()
                 + "." + tok.split(".")[1] + "." + tok.split(".")[2],
}
# sem exp
cab = base64.urlsafe_b64encode(b'{"alg":"HS256"}').rstrip(b"=").decode()
pay_no_exp = base64.urlsafe_b64encode(
    json.dumps({"sub":"1","role":"admin"}, separators=(',',':')).encode()).rstrip(b"=").decode()
sig = base64.urlsafe_b64encode(
    hmac.new(t.k, f"{cab}.{pay_no_exp}".encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
casos["sem exp"] = f"{cab}.{pay_no_exp}.{sig}"

for nome, tk in casos.items():
    try:
        r = t.valida(tk); print(f"   {nome:<11} ⚠ ACEITO: {r}")
    except ValueError as e:
        print(f"   {nome:<11} ✓ rejeitado ({e})")
print()

# ── 6. SENHA ──
print("── classe 3: senha com KDF lento ──")
h1 = Senha.guarda(b"minha-senha")
h2 = Senha.guarda(b"minha-senha")
print(f"   hash1: {h1[:40]}...")
print(f"   hash2: {h2[:40]}...")
print(f"   ⚠ iguais? {h1 == h2}  → {'✓ salt diferente' if h1 != h2 else '⚠ sem salt'}")
print(f"   verifica correta : {Senha.verifica(b'minha-senha', h1)}")
print(f"   verifica errada  : {Senha.verifica(b'outra', h1)}")
print()

print("═══ A TABELA DE PROVA ═══")
print()
print("  ┌──────────────────────────┬────────────────────────┬──────────┐")
print("  │ correção                 │ prova                  │ passou?  │")
print("  ├──────────────────────────┼────────────────────────┼──────────┤")
print(f"  │ erro uniforme            │ {len(msg_set)} mensagem(ns) distintas │ {'✓' if len(msg_set)==1 else '⚠'}        │")
print(f"  │ comparação constante     │ variação {variacao:>4.1f}%           │ {'✓' if variacao<25 else '⚠'}        │")
print(f"  │ nonce único              │ ct do mesmo dado difere│ {'✓' if a!=b else '⚠'}        │")
print(f"  │ MAC com contexto         │ usos separados         │ {'✓' if ta!=tb else '⚠'}        │")
print(f"  │ token: alg fixo          │ 3 ataques rejeitados   │ ✓        │")
print(f"  │ senha: salt único        │ hash difere por chamada│ {'✓' if h1!=h2 else '⚠'}        │")
print("  └──────────────────────────┴────────────────────────┴──────────┘")
PY

cp ../mod09/cripto_seguro.py . 2>/dev/null
python3 prova-correcao.py
```

⚠ **A tabela de prova é o entregável.** Cada correção com **a medição que a confirma** — não com a
declaração de que foi aplicada. **É o mesmo "selo" do módulo 10 do curso de Linux.**

⚠ **E note a prova do nãoce:** o script calcula o **XOR dos cyphertexts** e mostra que **não é
zeros**. **Com nonce repetido, o XOR dos cyphertexts seria o XOR dos plaintexts** — e no caso do
mesmo dado, **seria zeros**. **É a verificação direta.**

**Produza `prova.md`:**

| Correção | Como provou | Passou? |
|---|---|---|
| Erro uniforme | | |
| Comparação constante | | |
| Nonce único | | |
| MAC com contexto | | |
| Token | | |
| Senha | | |

**Responda:**

1. **Quantas correções você provou?**
2. Qual prova foi a **mais direta**?
3. Alguma **não passou**? **Por quê?**
4. **O que "provar" significa** aqui, e por que não basta declarar?

---

### Fase 5 — O relatório (20 min)

**Produza `relatorio-cripto.md`:**

```markdown
# Revisão de Criptografia — [sistema]

## 1. Escopo e método
| Item | Valor |
|---|---|
| Alvo | |
| Base de acesso | |
| Data | |
| Método | inventário + cinco classes + prova |

## 2. Inventário
| Família | O que o sistema usa |
|---|---|
| Cifra simétrica | |
| Cifra assimétrica | |
| Hash | |
| MAC | |
| KDF | |
| Assinatura | |
| Aleatoriedade | |
| TLS | |
| Token | |
| Chave | |

## 3. Achados
| # | Classe | Achado | O que o atacante obtém | Severidade | Exige migração |
|---|---|---|---|---|---|

## 4. Achados por classe
| Classe | Achados | Críticos |
|---|---|---|
| 1 — Oracle | | |
| 2 — Nonce | | |
| 3 — Entropia | | |
| 4 — Validação | | |
| 5 — Protocolo | | |

## 5. O que está correto
⚠ Importante: liste o que você verificou e está bom.
   Um relatório só de falhas esconde o que não foi olhado.

## 6. Correções aplicadas e provadas
| # | Correção | Prova | Resultado |
|---|---|---|---|

## 7. O que NÃO foi verificado
⚠ Obrigatório, mínimo 3

## 8. Declaração de conduta
| Ação | Feita? |
|---|---|
| Li código do alvo | sim |
| Executei ataque contra alvo de terceiro | **não** |
| Quebrei chave de terceiro | **não** |
| Rodei servidor exposto fora do loopback | **não** |
| Reportei ao mantenedor (se projeto aberto) | (conforme) |

## 9. Ordem de correção recomendada
| # | Correção | Esforço | Impacto | Exige janela? |
|---|---|---|---|---|
```

⚠ **A seção 5 é a que diferencia relatório bom de alarme.** Um relatório só de falhas **parece mais
grave e é menos útil** — porque o cliente não sabe **o que já está bem**. **Listar o correto é
informação, não enchimento.**

⚠ **E a seção 9 é a que o cliente executa.** Ordenada por **esforço × impacto** — e marcando o que
exige janela. **É o mesmo princípio do módulo 10 do curso de Linux.**

---

## 10.2 A rubrica

| # | Item | Peso |
|---|---|---|
| 1 | **Inventário completo** (dez famílias) | 15% |
| 2 | **Achados das cinco classes** | 25% |
| 3 | "O que o atacante obtém" e "custo" em cada achado | 15% |
| 4 | Evidência com **comando e saída literal** | 10% |
| 5 | **Correção com prova** | 15% |
| 6 | Seção "o que está correto" | 5% |
| 7 | Seção "não verificado" (3+ itens) | 5% |
| 8 | Ordem de correção por esforço × impacto | 5% |
| 9 | Declaração de conduta | 5% |

**Penalidades automáticas:**

- Achado sem "o que o atacante obtém": −10% cada.
- Correção sem prova: −10% cada.
- **Ataque contra alvo de terceiro**: **projeto zerado**.
- Classe 5 declarada como "não aplicável" sem justificativa: −10%.
- Ausência da seção "não verificado": −10%.
- Relatório sem a seção "o que está correto": −5%.

---

## 10.3 Roteiro

| Bloco | Duração | O que fazer |
|---|---|---|
| 1 | 25 min | Inventário das dez famílias |
| 2 | 35 min | As cinco classes |
| 3 | 35 min | O achado, no formato completo |
| 4 | 25 min | Correção e **prova** |
| 5 | 20 min | Relatório |

---

## 10.4 Critérios de aceitação

- `inventario.sh` rodado, com as **dez** famílias mapeadas.
- Você identificou **uma família ausente** que deveria estar.
- `revisa-classes.sh` rodado, com as **cinco** classes procuradas.
- Você reconheceu que a **classe 5 não é visível no código**.
- `achados.md` com **pelo menos cinco** achados.
- Cada achado com **"o que o atacante obtém"** e **"custo do ataque"**.
- Cada achado com **evidência literal** e **caminho descrito sem executar**.
- Você marcou quais achados **exigem migração de dado**.
- `prova-correcao.py` rodando, com as **seis** provas.
- A prova do **erro uniforme** mostrou **uma mensagem distinta**.
- A prova do **tempo** mostrou **variação baixa**.
- A prova do **nonce** mostrou que o XOR **não é zeros**.
- `relatorio-cripto.md` com as **nove** seções.
- Seção 5 com o que **está correto**.
- Seção 7 com **três itens** mínimos.
- Seção 9 com ordem por **esforço × impacto**.
- Declaração de conduta preenchida.
- ⚠ **Nenhum ataque contra alvo de terceiro.**

---

## Avaliação final

1. **Cite as dez famílias** do inventário criptográfico.
2. **Por que a ausência de uma família é achado?** Dê dois exemplos.
3. **Cite as cinco classes** e como cada uma se detecta.
4. **Qual classe nenhum `grep` pega?** Por quê?
5. **Por que a classe 5 não é visível no código?** O que a substitui?
6. O que a seção **"o que o atacante obtém"** resolve?
7. Por que a seção **"exige migração"** é decisiva para prioridade?
8. **Como você prova** que não há oracle de erro?
9. **Como você prova** que a comparação é em tempo constante?
10. **Como você prova** que o nonce é único? (Dica: XOR dos cyphertexts.)
11. **O que "provar" significa** aqui, e por que declarar não basta?
12. **Por que a seção "o que está correto" importa?**
13. Dê um exemplo de achado **irrelevante** e de achado **grave** que parecem iguais.
14. **Por que a ordem de correção é por esforço × impacto?**
15. **Qual a diferença** entre auditar repositório público e testar instância pública?
16. Por que uma falha de criptografia é **global**, diferente de má configuração?
17. **Qual achado deste curso é o mais grave** na sua opinião? Por quê?
18. **Se você só pudesse fazer uma correção**, qual daria mais segurança?
19. **O algoritmo estava certo na maioria dos achados?** O que isso prova?
20. **O que você faria diferente** numa próxima revisão?

---

## Encerramento do curso

Você começou em "usa AES" e terminou revisando um sistema criptográfico inteiro, identificando as
**cinco classes de falha**, provando que a correção funciona, e entregando um relatório com ordem de
correção.

O que você aprendeu não foi matemática. Foi que **o algoritmo está certo** — e que **quebraram o
modo, a aleatoriedade, a chave, o protocolo, e a validação**. E que **quase toda correção é "usar a
função certa"**.

| # | O que fica |
|---|---|
| 1 | **Ninguém quebra AES.** Quebram o modo, a chave, o RNG, o protocolo, a validação. |
| 2 | **A aleatoriedade é a causa nº 1** — e a operacional, não a matemática. |
| 3 | **Sem integridade, confidencialidade não protege** — é o padding oracle. |
| 4 | **Toda a segurança mora na chave** — e a política de chave é onde a maioria falha. |
| 5 | **Não invente criptografia.** Escolha a construção, não escreva a primitiva. |
| 6 | **A correção é curta. O trabalho está em achar.** |

⚠ **E a ponte para o próximo curso.** O **exploit development** fecha a trilha: ele assume
**Linux para Segurança** (memória, `/proc`, ASLR) e **C para Segurança** (UB, corrupção, alvo
fuzzável) — e o ASLR que ele contorna é **esta matéria**: aleatoriedade aplicada.

Referências para continuar: **NIST SP 800-38A–38D** · **SP 800-90A/B/C** · **SP 800-57** ·
**RFC 8446** (TLS 1.3) · **RFC 8017** (RSA) · **RFC 8032** (EdDSA) · **RFC 9106** (argon2) ·
**"Serious Cryptography"** (Aumasson) · **"Real-World Cryptography"** (Wong) ·
**"Bulletproof TLS and PKI"** (Ristić) · **Crypto101** · **Cryptopals** ·
**OWASP Cryptographic Storage Cheat Sheet**
