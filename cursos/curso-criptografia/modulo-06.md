# Módulo 6 — TLS de Verdade

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 5; curso de **Redes** (handshake, TCP)

---

## Objetivos

1. Entender o handshake do TLS 1.3 e **por que cada passo existe**.
2. Ler um certificado X.509 campo por campo, e entender o que cada um **prova**.
3. Validar a **cadeia** de confiança — e reconhecer quando a validação **não** acontece.
4. Saber o que o **cadeado** diz e o que ele **não** diz.
5. Reconhecer as falhas de TLS por **configuração**, não por algoritmo.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **TLS está correto. O que falha é a validação do certificado, a configuração do servidor, e o
> downgrade para protocolo velho.**

⚠ **A evidência:**

| Incidente | Protocolo | O que quebrou |
|---|---|---|
| **Heartbleed (2014)** | TLS 1.2 | **Implementação** — leitura fora do buffer |
| **DROWN (2016)** | TLS 1.2 | **Servidor aceitava SSLv2** — mesma chave |
| **FREAK (2015)** | TLS | **Export ciphers** — RSA de 512 bits |
| **Logjam (2015)** | TLS | **Diffie-Hellman de 512 bits** |
| **ROBOT (2017)** | TLS | **Padding oracle em RSA** (módulo 5) |
| **BEAST (2011)** | TLS 1.0 | **IV previsível no CBC** (módulo 3) |
| **CRIME / BREACH** | TLS | **Compressão** vaza por tamanho |
| **Certificado não validado** | TLS | **Validação desligada no cliente** |
| **Superfish / Dell** | TLS | **CA raiz instalada** no dispositivo |
| **Downgrade a SSLv3** | TLS | **POODLE** |

⚠ **A última linha da primeira metade é a que aparece em **relatório de auditoria de aplicação**:
um cliente HTTP que **não valida** — porque `verify=False`, porque o *pin* não foi fixado, ou
porque o certificado foi aceito sem checar a cadeia. **O TLS está correto e a validação não
acontece.**

⚠ **E o "cadeado" é o sintoma mais enganoso da área.** Ele diz **três coisas** e só três:

| O cadeado diz | O cadeado **não** diz |
|---|---|
| O canal está cifrado | Que o site é **honesto** |
| O domínio no certificado **casa** | Que o conteúdo é **seguro** |
| A cadeia **termina** numa CA confiável | Que a CA fez o trabalho **direito** |

---

## 6.1 O handshake do TLS 1.3

⚠ **O TLS 1.3 tem um round-trip.** E cada passo existe para resolver **um** problema.

```
CLIENTE                                                    SERVIDOR
   │                                                          │
   │ ── ClientHello ─────────────────────────────────────────▶│
   │    · versões suportadas                                  │
   │    · grupos (curvas)                                     │
   │    · cifras (AEAD apenas)                                │
   │    · key_share (chave pública EFÊMERA)   ← ⚠ ECDHE        │
   │    · random                                              │
   │                                                          │
   │◀────────────────────────────── ServerHello ─────────────│
   │    · versão escolhida                                    │
   │    · cifra escolhida                                     │
   │    · key_share do servidor (efêmera)                     │
   │    ⚠ a partir daqui TUDO é cifrado                       │
   │                                                          │
   │◀───────── {EncryptedExtensions} ────────────────────────│
   │◀───────── {Certificate} ────────────────────────────────│  ⚠ assinatura
   │◀───────── {CertificateVerify} ──────────────────────────│  ⚠ chave do certificado assina
   │◀───────── {Finished} ───────────────────────────────────│     o transcript
   │                                                          │
   │ ── {Finished} ──────────────────────────────────────────▶│
   │                                                          │
   │ ◀══════════════ APLICAÇÃO ═════════════════════════════▶│
```

⚠ **A linha do `key_share` é o coração do *forward secrecy*.** As chaves são **efêmeras** — geradas
por sessão e descartadas. **Por isso a chave privada do servidor, vazada amanhã, não decifra o
tráfego de hoje.**

⚠ **E a linha do `CertificateVerify` é o que resolve o MITM do módulo 4.** O servidor **assina o
transcript** do handshake com a chave do certificado. **O MITM não pode assinar** — porque não tem a
privada. **É a autenticação que o ECDH puro não dava.**

### O que mudou do 1.2 para o 1.3

| Item | TLS 1.2 | TLS 1.3 |
|---|---|---|
| Round-trips | 2 | **1** |
| Forward secrecy | Opcional (se ECDHE) | **Sempre** |
| AEAD | Opcional | **Obrigatório** |
| Renegociação | Permitida | **Removida** |
| Compressão | Opcional (CRIME) | **Removida** |
| Cifras | ~30, várias fracas | **5, todas boas** |
| RSA key transport | Permitido | **Removido** |
| 0-RTT | — | Existe ⚠ **com risco de replay** |

⚠ **A linha da compressão é a correção do CRIME.** Comprimir **antes** de cifrar vaza por
**tamanho** — é o ataque de compressão, e **remover a feature foi a correção**.

⚠ **E a linha do `0-RTT` é a exceção que merece cuidado.** Ele permite **dado na primeira
mensagem** — antes do handshake completo — e por isso é **suscetível a replay**. **Use só para dado
idempotente** (um `GET`, nunca um `POST` de pagamento).

```bash
mkdir -p ~/crypto-lab/mod06 && cd ~/crypto-lab/mod06

echo "═══ 1. um servidor TLS local para inspecionar ═══"
cd ~/crypto-lab/mod06

# gera uma CA própria e um certificado de servidor
mkdir -p pki && cd pki

# ── CA raiz ──
openssl genrsa -out ca.key 4096 2>/dev/null
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
  -subj "/CN=Minha CA de Laboratorio/O=Lab/C=BR" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign" \
  -out ca.crt 2>/dev/null && echo "  ✓ CA raiz criada"

# ── chave do servidor (ECDSA P-256) ──
openssl ecparam -name prime256v1 -genkey -noout -out server.key 2>/dev/null
openssl req -new -key server.key -subj "/CN=localhost/O=Lab/C=BR" -out server.csr 2>/dev/null

# ── certificado assinado pela CA, com SAN ──
cat > ext.cnf <<'EOF'
basicConstraints=CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:localhost,IP:127.0.0.1,DNS:*.lab.local
EOF

openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 365 -sha256 -extfile ext.cnf 2>/dev/null && echo "  ✓ certificado de servidor criado"

ls -la *.crt *.key 2>/dev/null | awk '{printf "  %-14s %s\n", $NF, $5}'
```

⚠ **A SAN (`subjectAltName`) é o campo que importa hoje.** O `CN` **não** é mais usado para
validação de nome — **desde 2017**, todo navegador exige **SAN**. Um certificado com `CN` certo e
**sem SAN** é **rejeitado**. **É a causa mais comum de "o certificado não confere" em laboratório.**

**Produza `handshake.md`:**

| Passo do TLS 1.3 | O que resolve | Sem ele, o problema |
|---|---|---|
| `key_share` | | |
| `Certificate` | | |
| `CertificateVerify` | | |
| `Finished` | | |

**Responda:**

1. **Como o TLS 1.3 dá forward secrecy sempre?**
2. **O que o `CertificateVerify` resolve** que o ECDH sozinho não?
3. Por que a **compressão foi removida** no 1.3?
4. O que o **0-RTT** arrisca, e quando é aceitável?

---

## 6.2 O certificado, campo por campo

⚠ **O certificado é a peça que o TLS usa para autenticar. E cada campo tem função.**

```bash
cd ~/crypto-lab/mod06/pki

echo "═══ 2. o certificado, legível ═══"
openssl x509 -in server.crt -noout -text 2>/dev/null | head -50
```

### Os campos que importam para segurança

| Campo | O que diz | ⚠ O que acontece se errado |
|---|---|---|
| **`Subject`** | De quem é | Nome não casa |
| **`Issuer`** | Quem assinou | Cadeia quebra |
| **`SubjectAltName`** | **Nomes válidos** | ⚠ Sem SAN, é rejeitado |
| **`Not Before/After`** | Validade | Expirado, ou **not before no futuro** |
| **`Basic Constraints`** | É CA? | ⚠ **`CA:TRUE` num leaf** permite assinar |
| **`Key Usage`** | Pra que serve a chave | Sem `digitalSignature`, não assina |
| **`Extended Key Usage`** | Tipo de uso | `serverAuth` ausente = não é de servidor |
| **`Subject Key Identifier`** | Identificador | Não é segurança |
| **`Authority Key Identifier`** | Qual chave assinou | ⚠ **Ajuda a montar a cadeia** |
| **`CRL Distribution`** | Onde verificar revogação | Revogação não é checada |
| **`OCSP`** | Idem, online | Idem |
| **`Certificate Policies`** | Política da CA | Não é segurança |
| **`CT SCTs`** | Log de transparência | ⚠ **Ausência = não auditável** |
| **`Signature Algorithm`** | Como foi assinado | ⚠ **`sha1WithRSA` é morto** |

⚠ **A linha do `CA:TRUE` num leaf é uma falha real:** se um certificado comum tem `basicConstraints:
CA:TRUE`, **ele pode assinar outros certificados** — e quem tem a chave dele **emite certificado
válido para qualquer domínio**. **A verificação correta rejeita isso.**

⚠ **E a linha do `Authority Key Identifier` explica a cadeia.** Ao validar, o cliente precisa
descobrir **qual certificado assinou este** — e o `AKI` aponta para o `SKI` do emissor. **Sem ele,
a montagem da cadeia é por tentativa.**

```bash
echo "═══ 3. os campos que importam, extraídos ═══"
for campo in subject issuer "subjectAltName" "notBefore" "notAfter" "basicConstraints" \
             "keyUsage" "extendedKeyUsage"; do
    printf '  %-22s ' "$campo:"
    openssl x509 -in server.crt -noout -ext "$campo" 2>/dev/null | tail -n +2 | tr '\n' ' ' | head -c 70
    echo
done

echo
echo "  ── e o que o OpenSSL valida ═══"
openssl verify -CAfile ca.crt server.crt 2>&1 | sed 's/^/    /'
```

⚠ **O `openssl verify` é o instrumento.** Ele responde **se a cadeia é válida** — e é o que você vai
usar em auditoria para confirmar que o certificado serve.

⚠ **E ele **não** checa expiração por padrão em alguns modos** — por isso a auditoria precisa das
duas verificações:

```bash
echo "═══ 4. as duas verificações que importam ═══"
echo
echo "  ── (a) a cadeia é válida? ──"
openssl verify -CAfile ca.crt server.crt 2>&1 | sed 's/^/    /'
echo
echo "  ── (b) o certificado está no período de validade? ──"
NF=$(openssl x509 -in server.crt -noout -startdate 2>/dev/null | cut -d= -f2)
NA=$(openssl x509 -in server.crt -noout -enddate 2>/dev/null | cut -d= -f2)
echo "    notBefore: ${NF}"
echo "    notAfter : ${NA}"
echo
# teste com data futura
FUTURO=$(date -d "+400 days" +%Y%m%d%H%M%SZ 2>/dev/null || date -v+400d +%Y%m%d%H%M%SZ 2>/dev/null)
[ -n "$FUTURO" ] && {
    echo "    verificando como se fosse ${FUTURO}:"
    openssl verify -CAfile ca.crt -attime "$(date -d "+400 days" +%s 2>/dev/null || date -v+400d +%s 2>/dev/null)" server.crt 2>&1 | sed 's/^/      /'
}
echo
echo "  ⚠ note: 'verify' e 'validade' são verificações SEPARADAS."
echo "     um certificado pode ter cadeia válida e estar expirado."
```

⚠ **A última frase é a lição do bloco.** Cadeia válida **não** implica validade temporal — e
**cliente mal implementado checa uma e não a outra**. **É o tipo de falha que aparece em app mobile
que não valida expiração.**

**Produza `certificado.md`:**

| Campo | Valor no seu | O que prova |
|---|---|---|
| `Subject` | | |
| `Issuer` | | |
| `SAN` | | |
| `notBefore` | | |
| `notAfter` | | |
| `Basic Constraints` | | |
| `Signature Algorithm` | | |

**Responda:**

1. **Por que o `CN` não basta** hoje? O que substituiu?
2. O que **`CA:TRUE` num leaf** permite de errado?
3. **Para que serve o `Authority Key Identifier`?**
4. **Cadeia válida implica não-expirado?** Explique.

---

## 6.3 A cadeia — e onde ela quebra

⚠ **A cadeia é o que dá significado ao certificado.** Sem ela, um certificado é um papel assinado
por ninguém.

```
┌──────────────────────────────────────────────────────────────┐
│  CA RAIZ (auto-assinada)                                     │
│    · está no trust store do SO/navegador                     │
│    · ⚠ se comprometida, TUDO abaixo cai                       │
│    · ~150 CAs raízes confiadas por padrão                     │
│         │  assina                                             │
│         ▼                                                     │
│  CA INTERMEDIÁRIA                                            │
│    · ⚠ é o que o servidor ENVIA no handshake                  │
│    · lembra do caso "cadeia incompleta"                       │
│         │  assina                                             │
│         ▼                                                     │
│  CERTIFICADO DO SERVIDOR (leaf)                              │
│    · o que autentica o domínio                               │
│    · ⚠ é o que a aplicação valida                             │
└──────────────────────────────────────────────────────────────┘
```

⚠ **A linha da CA raiz explica por que "instalar a CA do laboratório" é o passo necessário** — e é
a razão de o lab fazer isso: você **não confia** na sua CA até adicioná-la.

⚠ **E a linha da CA intermediária explica a falha mais comum em servidor:** o servidor envia **só o
leaf**, sem a intermediária. **O navegador dá "cadeia quebrada"** — e a correção é **enviar a
cadeia**.

⚠ **As falhas de cadeia, e o que cada uma significa:**

| Falha | Sintoma | Causa |
|---|---|---|
| **Cadeia incompleta** | "cadeia quebrada" no cliente | Servidor não envia a intermediária |
| **Raiz não confiada** | "certificado desconhecido" | CA própria, ou CA não no store |
| **Ordem errada** | alguns clientes falham | Leaf primeiro, depois intermediárias |
| **CA expirada** | tudo abaixo falha | Intermediária vencida |
| **Nome não casa** | "domínio inválido" | SAN sem o nome usado |
| **Autoridade errada** | "não confiável" | Assinado por CA que não está no store |
| **Revogado** | ⚠ **frequentemente NÃO detectado** | Cliente não checa CRL/OCSP |

⚠ **A última linha é a que o módulo 8 explora.** **A maioria dos clientes não checa revogação** —
porque CRL é grande e OCSP é lento. **A consequência: certificado roubado continua válido na
prática.**

⚠ **E é por isso que existem as defesas modernas:** **OCSP stapling** (o servidor apresenta a
prova) e **certificados de curta duração** (CT e Let's Encrypt com 90 dias). **Reduzir a validade
resolve o problema que a revogação não resolveu.**

```bash
echo "═══ 5. a cadeia, e a verificação de cada elo ═══"
cd ~/crypto-lab/mod06/pki

echo "  ── montando a cadeia ──"
echo "    leaf   : $(openssl x509 -in server.crt -noout -subject 2>/dev/null)"
echo "    iss    : $(openssl x509 -in server.crt -noout -issuer 2>/dev/null)"
echo
echo "    CA     : $(openssl x509 -in ca.crt -noout -subject 2>/dev/null)"
echo "    iss    : $(openssl x509 -in ca.crt -noout -issuer 2>/dev/null)"
echo
echo "    ⚠ 'iss' do leaf casa com o 'subject' da CA? Por isso a cadeia fecha."
echo

echo "  ── verificando cada elo ──"
echo "    leaf assinado pela CA:"
openssl verify -CAfile ca.crt server.crt 2>&1 | sed 's/^/      /'
echo
echo "    e se a CA não estiver no trust store?"
openssl verify server.crt 2>&1 | sed 's/^/      /'
echo

echo "  ── cadeia incompleta: o que o servidor pode enviar errado ──"
echo "    um servidor pode:"
echo "      ✓ enviar: leaf + intermediária  → o cliente monta até a raiz"
echo "      ⚠ enviar: só o leaf             → o cliente não tem a intermediária"
echo
echo "    no arquivo do servidor, a ordem é: leaf PRIMEIRO"
cat server.crt > cadeia.crt
cat ca.crt >> cadeia.crt
echo "    ✓ cadeia.crt contém: leaf + CA (a raiz não precisa ir)"
grep -c 'BEGIN CERTIFICATE' cadeia.crt | xargs echo "    certificados no arquivo:"
```

⚠ **A última verificação é a que evita o problema clássico:** **o arquivo do servidor deve conter
leaf + intermediárias**, na ordem. **A raiz não vai** — ela está no store do cliente.

**Produza `cadeia.md`:**

| Elo | Sujeito | Emissor | Fecha? |
|---|---|---|---|
| Leaf | | | |
| Intermediária | | | |
| Raiz | | | |

**Responda:**

1. **Por que a raiz não vai no arquivo do servidor?**
2. **Quantos certificados** o arquivo de cadeia deve ter?
3. Por que "cadeia incompleta" quebra **só em alguns clientes**?
4. **Por que a revogação frequentemente não é detectada?**

---

## 6.4 O que o cadeado não diz

⚠ **As dez coisas que "tem cadeado" não garante.**

| ⚠ O cadeado não garante | Por quê |
|---|---|
| Que o site é honesto | `phishing-exemplo.com` também tem cadeado |
| Que o conteúdo é seguro | Cifra não impede injeção (módulo 1) |
| Que o **servidor** é bem configurado | Pode ter TLS 1.0 ligado |
| Que o **cliente** valida | App pode ter `verify=False` |
| Que o certificado é **revogado** corretamente | Cliente pode não checar |
| Que **não há MITM corporativo** | Proxy com CA instalada decifra tudo |
| Que o **protocolo** é o mais forte | Pode negociar TLS 1.0 |
| Que a **cifra** é a mais forte | Pode negociar RC4 ou 3DES |
| Que a **chave privada** está bem guardada | Pode estar num servidor compartilhado |
| Que o **domínio** é o que você digitou | Homógrafo/typosquatting |

⚠ **A linha do **MITM corporativo** merece atenção.** Um proxy de inspeção instala **uma CA raiz** no
dispositivo — e passa a **decifrar tudo**, re-assinando com a CA dele. **O cadeado continua
aparecendo.** **É por isso que "CA raiz instalada" é achado em auditoria de dispositivo.**

⚠ **E a linha do **cliente que não valida** é a mais frequente em código.** O padrão de biblioteca
**é validar** — mas existe a flag que desliga, e ela **fica**.

⚠ **A tabela de `verify=False` equivalente por linguagem:**

| Linguagem | ⚠ Padrão que desliga validação |
|---|---|
| Python `requests` | `verify=False` |
| Python `urllib3` | `cert_reqs='CERT_NONE'` |
| Node.js | `rejectUnauthorized: false` |
| Java | `TrustManager` que aceita tudo |
| Go | `InsecureSkipVerify: true` |
| C# | `ServerCertificateCustomValidationCallback` que retorna `true` |
| curl | `-k` / `--insecure` |
| wget | `--no-check-certificate` |

⚠ **Cada linha da tabela é um achado de gravidade alta.** E **o `grep` correspondente é o
instrumento:**

```bash
echo "═══ 6. a busca por validação desligada ═══"
cd ~/crypto-lab
echo
echo "  ── PADRÕES DE VALIDAÇÃO DESLIGADA ──"
declare -A INSEC=(
  ["verify=False"]="Python requests"
  ["CERT_NONE"]="urllib3"
  ["InsecureSkipVerify"]="Go"
  ["rejectUnauthorized"]="Node.js"
  ["Proc-Type"]="-"
  ["--insecure"]="curl"
  ["--no-check-certificate"]="wget"
  ["sslv3"]="protocolo morto"
  ["SSLv3"]="protocolo morto"
  ["TLSv1_method"]="TLS 1.0"
  ["PROTOCOL_SSLv23"]="negocia o mais fraco"
  ["setHostnameVerifier"]="Java"
)
for pat in "${!INSEC[@]}"; do
    n=$(grep -rF "$pat" . --include='*.py' --include='*.js' --include='*.go' \
         --include='*.java' --include='*.sh' --include='*.c' --include='*.cs' 2>/dev/null | wc -l)
    [ "$n" -gt 0 ] && printf '  ⚠ %-24s %s  (%s)\n' "$pat" "$n" "${INSEC[$pat]}"
done
echo "  (fim)"
echo
echo "  ⚠ cada ocorrência em código que fala com produção é achado ALTO."
echo "     a correção é remover a linha — e o certificado volta a ser validado."
```

⚠ **A frase final é o que torna o achado acionável.** **A correção é remover uma linha** — e o
código passa a validar. **É o achado de maior relação impacto/esforço da área de TLS.**

**Produza `cadeado.md`:**

| O cadeado não garante | Como se verifica |
|---|---|
| Site honesto | | |
| Servidor bem configurado | | |
| Cliente valida | | |
| Sem MITM corporativo | | |
| Protocolo forte | | |

**Responda:**

1. **Quantos padrões de validação desligada** você encontrou?
2. Por que `phishing-exemplo.com` tem cadeado válido?
3. **Como você detecta MITM corporativo** na sua rede?
4. Se você viu `verify=False` em código de produção, **qual a severidade**?

---

## 6.5 As falhas de configuração

⚠ **TLS está correto. O que falha é a **configuração** — e ela é enumerável.**

| Falha | Como aparece | Ferramenta |
|---|---|---|
| **Protocolo antigo habilitado** | SSLv3, TLS 1.0, TLS 1.1 | `openssl s_client -ssl3` |
| **Cifra fraca** | RC4, 3DES, `EXPORT`, `NULL` | `nmap --script ssl-enum-ciphers` |
| **Cifra anônima** | `ADH`, `AECDH` — **sem certificado** | idem |
| **Renegociação permitida** | Interação com o handshake | idem |
| **Compressão ligada** | CRIME | idem |
| **Heartbeat ligado** | Heartbleed (histórico) | idem |
| **Certificado fraco** | RSA 1024, SHA-1 | `openssl x509 -text` |
| **Cadeia incompleta** | faltando intermediária | `openssl s_client -showcerts` |
| **SAN ausente** | rejeitado por navegador | `openssl x509 -ext subjectAltName` |
| **HSTS ausente** | sem `Strict-Transport-Security` | `curl -I` |
| **Downgrade possível** | sem HSTS, ou sem preload | `curl -I` |
| **Revogação não checável** | OCSP/CRL ausente ou lento | `openssl s_client -status` |

⚠ **A linha da **cifra anônima** merece destaque, porque é a pior da lista.** `ADH` e `AECDH`
significam "**sem certificado**" — **não há autenticação nenhuma**. **O canal é cifrado e qualquer
um pode estar no meio.** Um servidor com cifra anônima habilitada é **pior que HTTP sem TLS**,
porque **parece** seguro.

⚠ **E a linha do HSTS é a defesa contra downgrade.** Sem ele, um atacante na rede **reescreve o
`http://`** para o usuário — e o usuário **nunca chega ao HTTPS**. **Com HSTS, o navegador recusa
HTTP e força HTTPS** — **e o atacante não consegue rebaixar**.

```bash
echo "═══ 7. enumerando a configuração de TLS ═══"
echo
echo "  ⚠ teste contra o SEU servidor local, nunca contra terceiro"

# sobe um servidor TLS local para testar
cd ~/crypto-lab/mod06/pki

if command -v openssl >/dev/null; then
    # servidor em background
    (openssl s_server -accept 8443 -cert server.crt -key server.key -www \
      -tls1_2 2>/dev/null &) ; SRV=$!
    sleep 1

    echo "  ── o que o servidor negocia (default) ──"
    echo | timeout 5 openssl s_client -connect 127.0.0.1:8443 -tls1_2 2>/dev/null | \
        grep -E 'Protocol|Cipher|Server public key|Verify return code' | head -6 | sed 's/^/    /'
    echo

    echo "  ── o que ele NÃO aceita ──"
    for proto in -tls1 -tls1_1 -ssl3; do
        R=$(echo | timeout 4 openssl s_client -connect 127.0.0.1:8443 $proto 2>&1 | \
            grep -cE 'Protocol *: *TLS|begin SSL')
        if [ "$R" -gt 0 ] 2>/dev/null; then
            printf '    %-8s ⚠ ACEITA\n' "$proto"
        else
            printf '    %-8s ✓ recusado\n' "$proto"
        fi
    done
    echo

    echo "  ── a cadeia que o servidor envia ──"
    echo | timeout 5 openssl s_client -connect 127.0.0.1:8443 -showcerts 2>/dev/null | \
        grep -c 'BEGIN CERTIFICATE' | xargs echo "    certificados enviados:"
    echo

    pkill -f "s_server.*8443" 2>/dev/null
else
    echo "  (openssl s_server indisponível)"
fi

echo "═══ 8. as configurações que o servidor deveria ter ═══"
cat <<'EXPL'
  ── protocolos ──
    ✓ TLS 1.2 e 1.3 apenas
    ✗ SSLv2, SSLv3 (POODLE), TLS 1.0, TLS 1.1

  ── cifras (TLS 1.3, fixas) ──
    ✓ TLS_AES_128_GCM_SHA256
    ✓ TLS_AES_256_GCM_SHA384
    ✓ TLS_CHACHA20_POLY1305_SHA256
    ⚠ o 1.3 não permite escolher cifra fraca — é uma das razões de migrar

  ── cifras (TLS 1.2, para compatibilidade) ──
    ✓ ECDHE-*-GCM-SHA256/384
    ✓ ECDHE-*-CHACHA20-POLY1305
    ⚠ ECDHE obrigatório (forward secrecy)
    ✗ RSA key transport (sem forward secrecy)
    ✗ CBC sem AEAD (padding oracle — ROBOT, Lucky13)
    ✗ RC4, 3DES, EXPORT, NULL, ADH, AECDH

  ── outras ──
    ✓ HSTS com max-age longo, includeSubDomains, preload
    ✓ OCSP stapling
    ✓ Certificate Transparency (SCT)
    ✓ sessão: tickets curtos, sem 0-RTT para dado não-idempotente
    ✓ renogociação desabilitada
    ✓ compressão desabilitada
EXPL
```

⚠ **A seção 7 é o procedimento de auditoria.** Você enumera **protocolo**, **cifra** e **cadeia** —
e cada um tem uma falha correspondente. **É enumerável e verificável.**

⚠ **E a seção 8 é o alvo.** A configuração correta **não é preferência** — é a lista de **cifras que
não têm falha conhecida**, com **ECDHE obrigatório** (forward secrecy) e **AEAD obrigatório**
(padding oracle eliminado).

**Produza `config-tls.md`:**

| Item | Valor | Seguro? | Correção |
|---|---|---|---|
| Protocolo mínimo | | | |
| Cifras | | | |
| Cifra anônima | | | |
| Cadeia enviada | | | |
| HSTS | | | |
| OCSP stapling | | | |

**Responda:**

1. **Por que cifra anônima é pior que HTTP sem TLS?**
2. Por que **ECDHE obrigatório** importa (relacione com o módulo 4)?
3. Por que **AEAD obrigatório** importa (relacione com o módulo 3)?
4. **O que o HSTS impede** que a configuração de servidor não impede?

---

## 6.6 LAB — Validação de TLS

**Duração:** 120 min

### Passo 1 — Monte o servidor e valide o cliente (35 min)

```bash
cd ~/crypto-lab/mod06

cat > valida-tls.py <<'PY'
#!/usr/bin/env python3
"""valida-tls.py — as formas certas e erradas de validar TLS."""
import ssl, socket, sys

HOST, PORTA = "127.0.0.1", 8443
CA = "/home/user/crypto-lab/mod06/pki/ca.crt"

def cria_contexto(validar=True, ca=None, check_hostname=True):
    if validar:
        ctx = ssl.create_default_context(cafile=ca)   # ✓ valida cadeia
        ctx.check_hostname = check_hostname
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2  # ✓ mínimo
        return ctx
    else:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.check_hostname = False                    # ⚠⚠
        ctx.verify_mode = ssl.CERT_NONE               # ⚠⚠
        return ctx

def conecta(ctx, host=HOST, porta=PORTA, deve_falhar=None):
    try:
        with socket.create_connection((host, porta), timeout=5) as s:
            with ctx.wrap_socket(s, server_hostname=host) as ss:
                cert = ss.getpeercert()
                return ("ok", ss.version(), ss.cipher()[0], cert)
    except ssl.SSLCertVerificationError as e:
        return ("cert_erro", str(e)[:70], None, None)
    except Exception as e:
        return ("erro", f"{type(e).__name__}: {str(e)[:60]}", None, None)

if __name__ == "__main__":
    import os
    if not os.path.exists(CA):
        print(f"  ⚠ CA não encontrada em {CA} — ajuste o caminho")
        sys.exit(1)

    print("═══ AS FORMAS DE VALIDAR ═══")
    print()

    casos = [
        ("✓ com CA própria no trust store", cria_contexto(True, CA), "ok"),
        ("✓ sem CA (store do sistema)",      cria_contexto(True, None), "cert_erro"),
        ("⚠ verify=False",                   cria_contexto(False), "ok"),
    ]

    for nome, ctx, esperado in casos:
        r = conecta(ctx)
        marca = "✓" if r[0] == esperado else "·"
        print(f"  {marca} {nome}")
        print(f"     resultado: {r[0]}  {r[1] if r[1] else ''}")
        if r[0] == "ok" and r[2]:
            print(f"     TLS: {r[1]}   cifra: {r[2]}")
        print()

    print("═══ A DIFERENÇA QUE IMPORTA ═══")
    print()
    print("  ┌───────────────────────┬───────────────┬─────────────────┐")
    print("  │ contexto              │ cadeia        │ MITM possível?  │")
    print("  ├───────────────────────┼───────────────┼─────────────────┤")
    print("  │ com CA certa          │ ✓ validada    │ ✗ não           │")
    print("  │ sem CA                │ ⚠ FALHA       │ ✗ (não conecta) │")
    print("  │ verify=False          │ ⚠ IGNORADA    │ ⚠ SIM           │")
    print("  └───────────────────────┴───────────────┴─────────────────┘")
    print()
    print("  ⚠ a linha do meio é a SEGURA: ela falha em vez de conectar.")
    print("     falhar é melhor que conectar inseguro.")
    print("  ⚠ a última parece funcionar — e é a que permite MITM.")
PY

# sobe o servidor e roda o cliente
cd pki
(openssl s_server -accept 8443 -cert server.crt -key server.key -www -tls1_2 &) 2>/dev/null
sleep 1
cd ..
sed -i "s|CA = .*|CA = \"$(pwd)/pki/ca.crt\"|" valida-tls.py
python3 valida-tls.py
pkill -f "s_server.*8443" 2>/dev/null
```

Produza `validacao.md`:

| Contexto | Cadeia | Conectou? | MITM possível? |
|---|---|---|---|
| Com CA certa | | | |
| Sem CA | | | |
| `verify=False` | | | |

**Responda:**

1. **Qual dos três é o seguro?** Por quê?
2. Qual **parece** funcionar e é o inseguro?
3. Por que **falhar é melhor que conectar inseguro**?
4. **O que `verify=False` desliga** exatamente?

### Passo 2 — Enumerando a configuração (40 min)

```bash
cd ~/crypto-lab/mod06

cat > enumera-tls.sh <<'SCRIPT'
#!/usr/bin/env bash
# enumera-tls.sh — enumera a configuração de TLS de um servidor PRÓPRIO
set -uo pipefail

HOST="${1:?uso: enumera-tls.sh <host> [porta]}"
PORTA="${2:-443}"

echo "═══════════ CONFIGURAÇÃO DE TLS ═══════════"
echo "alvo: ${HOST}:${PORTA}   (⚠ use apenas em servidor PRÓPRIO)"
echo "data: $(date -Is)"
echo

echo "── 1. PROTOCOLOS ACEITOS ──"
for proto in tls1 ssl3 tls1_1 tls1_2 tls1_3; do
    R=$(echo | timeout 6 openssl s_client -connect "${HOST}:${PORTA}" -"$proto" 2>&1 | \
        grep -cE 'Cipher is|Protocol *:' 2>/dev/null || echo 0)
    if [ "$R" -gt 0 ] 2>/dev/null; then
        V=$(echo | timeout 6 openssl s_client -connect "${HOST}:${PORTA}" -"$proto" 2>/dev/null | \
            grep -oE 'Protocol *: *\S+' | head -1 | awk '{print $NF}')
        case "$proto" in
            ssl3|tls1|tls1_1) printf '  ⚠ %-8s ACEITO (%s) — DESABILITE\n' "$proto" "${V:-?}" ;;
            *)                 printf '  ✓ %-8s aceito (%s)\n' "$proto" "${V:-?}" ;;
        esac
    else
        printf '  ·  %-8s recusado\n' "$proto"
    fi
done
echo

echo "── 2. CIFRA NEGOCIADA ──"
echo | timeout 6 openssl s_client -connect "${HOST}:${PORTA}" 2>/dev/null | \
    grep -E 'Cipher *:|Protocol *:|Server public key' | sed 's/^/  /'
echo

echo "── 3. CIFRAS FRACAS HABILITADAS ──"
for c in 'RC4' '3DES' 'DES-CBC3' 'EXPORT' 'NULL' 'ADH' 'AECDH' 'MD5'; do
    R=$(echo | timeout 6 openssl s_client -connect "${HOST}:${PORTA}" -cipher "$c" 2>&1 | \
        grep -c 'Cipher is' 2>/dev/null || echo 0)
    [ "$R" -gt 0 ] 2>/dev/null && printf '  ⚠ %-10s HABILITADA\n' "$c"
done
echo "  (fim)"
echo

echo "── 4. CERTIFICADO ──"
echo | timeout 6 openssl s_client -connect "${HOST}:${PORTA}" 2>/dev/null | \
    openssl x509 -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null | sed 's/^/  /'
echo

echo "── 5. VALIDAÇÃO ──"
echo | timeout 6 openssl s_client -connect "${HOST}:${PORTA}" 2>&1 | \
    grep -E 'Verify return code|verify error' | head -3 | sed 's/^/  /'
echo

echo "── 6. CADEIA ENVIADA ──"
N=$(echo | timeout 6 openssl s_client -connect "${HOST}:${PORTA}" -showcerts 2>/dev/null | \
    grep -c 'BEGIN CERTIFICATE' || echo 0)
echo "  certificados: ${N}"
[ "$N" -le 1 ] && echo "  ⚠ só o leaf — provavelmente falta a intermediária"
echo

echo "── 7. OCSP STAPLING ──"
echo | timeout 6 openssl s_client -connect "${HOST}:${PORTA}" -status 2>&1 | \
    grep -E 'OCSP Response Status|OCSP response:' | head -3 | sed 's/^/  /'
echo

echo "── 8. HSTS (requer HTTP) ──"
if command -v curl >/dev/null; then
    curl -sI --max-time 6 "https://${HOST}/" 2>/dev/null | \
        grep -iE 'strict-transport' | sed 's/^/  /' || echo "  ⚠ sem cabeçalho HSTS"
fi
echo

echo "── VEREDICTO ──"
cat <<'EXPL'
  ✓ correto:  TLS 1.2 + 1.3, ECDHE, AEAD, cadeia completa, HSTS
  ⚠ achados:  protocolo < 1.2, cifra sem AEAD, cifra anônima,
              cadeia incompleta, sem HSTS, RSA key transport
EXPL
SCRIPT

chmod +x enumera-tls.sh

# testa contra o servidor local
cd pki
(openssl s_server -accept 8443 -cert server.crt -key server.key -www -tls1_2 &) 2>/dev/null
sleep 1
cd ..
./enumera-tls.sh 127.0.0.1 8443 2>&1 | tee tls.txt
pkill -f "s_server.*8443" 2>/dev/null
```

Produza `enumeracao-tls.md`:

| Item | Valor | Seguro? | Achado? |
|---|---|---|---|
| Protocolo mínimo | | | |
| Cifra | | | |
| Cifra fraca | | | |
| Cadeia | | | |
| OCSP | | | |
| HSTS | | | |

**Responda:**

1. **Quantos achados** no seu servidor de teste?
2. Qual cifra foi negociada? **Tem forward secrecy?**
3. A cadeia está completa?
4. **Qual achado você corrigiria primeiro?**

### Passo 3 — A regra e a correção (45 min)

```bash
cd ~/crypto-lab/mod06

cat > config-segura.conf <<'EOF'
# ═══════════════════════════════════════════════════════════
# Configuração de TLS endurecida — Linux para Segurança + Cripto
# ⚠ referência. Adapte ao seu servidor.
# ═══════════════════════════════════════════════════════════

# ── PROTOCOLOS ──
# ✓ TLS 1.2 e 1.3 apenas
# ✗ SSLv2, SSLv3, TLS 1.0, TLS 1.1
ssl_protocols TLSv1.2 TLSv1.3;

# ── CIFRAS ──
# ⚠ o TLS 1.3 IGNORA esta lista — ele tem cifras fixas e todas boas
# Esta lista vale para o TLS 1.2, onde você ainda escolhe.
ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:
ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:
ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

# ✓ ECDHE obrigatório (forward secrecy — módulo 4)
# ✓ AEAD obrigatório (GCM ou ChaCha20 — módulo 3)
# ✗ RSA key transport (sem forward secrecy)
# ✗ CBC sem AEAD (padding oracle — ROBOT)
# ✗ RC4, 3DES, EXPORT, NULL, ADH, AECDH

# o servidor escolhe a cifra, não o cliente
ssl_prefer_server_ciphers on;

# ── DH PARAMETERS ──
# ⚠ Logjam: DH de 512 bits. Use 2048+ ou, melhor, ECDHE.
# ssl_dhparam /etc/ssl/dhparam4096.pem;

# ── SESSÃO ──
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
# ✗ tickets de sessão longos (forward secrecy enfraquece)
ssl_session_tickets off;

# ── CERTIFICADO ──
# ✓ envie leaf + INTERMEDIÁRIAS, nesta ordem
# ssl_certificate     /etc/ssl/certs/fullchain.pem;
# ssl_certificate_key /etc/ssl/private/server.key;
# ⚠ a RAIZ não vai — está no trust store do cliente

# ── OCSP STAPLING ──
ssl_stapling on;
ssl_stapling_verify on;
# ssl_trusted_certificate /etc/ssl/certs/chain.pem;
resolver 1.1.1.1 8.8.8.8 valid=300s;

# ── HSTS ──
# ✓ força HTTPS e impede downgrade (módulo 6)
# ⚠ comece com max-age BAIXO e aumente — é difícil reverter
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
# ⚠ 'preload' só se você controla TODOS os subdomínios — é irreversível na prática
# add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# ── 0-RTT ──
# ⚠ permite replay. Use só se o dado for idempotente.
# ssl_early_data off;
EOF

echo "═══ 9. as correções, por achado ═══"
cat <<'EXPL'
  ┌─────────────────────────────────┬───────────────────────────────────────┐
  │ achado                          │ correção                              │
  ├─────────────────────────────────┼───────────────────────────────────────┤
  │ verify=False no cliente         │ remover a linha (1 linha)             │
  │ SSLv3/TLS1.0 habilitado         │ ssl_protocols TLSv1.2 TLSv1.3         │
  │ cifra CBC sem AEAD              │ lista de cifras com AEAD + ECDHE      │
  │ cifra anônima (ADH)             │ remover da lista (é pior que HTTP)    │
  │ RSA key transport               │ forçar ECDHE                          │
  │ DH de 512 bits                  │ ECDHE, ou dhparam 4096                │
  │ SHA-1 na assinatura             │ reemitar com SHA-256                  │
  │ cadeia incompleta               │ enviar leaf + intermediárias          │
  │ SAN ausente                     │ reemitar com subjectAltName           │
  │ sem HSTS                        │ add_header Strict-Transport-Security  │
  │ sem OCSP stapling               │ ssl_stapling on + trusted_certificate │
  │ tickets longos                  │ ssl_session_tickets off               │
  │ 0-RTT para POST                 │ ssl_early_data off                    │
  │ CA raiz corporativa no cliente  │ remover do trust store (módulo 6)     │
  └─────────────────────────────────┴───────────────────────────────────────┘
EXPL
```

Produza `regra-tls.md`:

```markdown
# Regra de TLS

## 1. Cliente
- [ ] NUNCA `verify=False` / `InsecureSkipVerify` / `rejectUnauthorized: false`
- [ ] CA própria adicionada ao trust store (não desligar validação)
- [ ] `check_hostname` ligado
- [ ] versão mínima TLS 1.2
- [ ] pinning quando o cliente controla o servidor (app mobile)

## 2. Servidor
- [ ] TLS 1.2 e 1.3 apenas
- [ ] ECDHE obrigatório (forward secrecy)
- [ ] AEAD obrigatório (GCM/ChaCha20)
- [ ] cifra anônima removida
- [ ] RSA key transport removido
- [ ] DH ≥ 2048, ou só ECDHE
- [ ] cadeia completa (leaf + intermediárias)
- [ ] SAN presente
- [ ] OCSP stapling
- [ ] HSTS com max-age ≥ 6 meses
- [ ] renovação automática (ACME)

## 3. Verificação
```bash
# protocolo e cifra
echo | openssl s_client -connect host:443 -tls1_2
# protocolos antigos
for p in ssl3 tls1 tls1_1; do echo | openssl s_client -connect host:443 -$p; done
# carga da cadeia
echo | openssl s_client -connect host:443 -showcerts | grep -c 'BEGIN CERTIFICATE'
# HSTS
curl -sI https://host/ | grep -i strict-transport
```
```

**Responda:**

1. **Qual a correção mais barata** e de maior impacto? (Dica: 1 linha.)
2. Por que **HSTS com preload é quase irreversível**?
3. Por que **`ssl_session_tickets off`** ajuda o forward secrecy?
4. **Qual achado você consideraria crítico**, e qual só alto?

### Critérios de aceitação

- `handshake.md` com os quatro passos e o que cada um resolve.
- Você explicou por que o TLS 1.3 **sempre** dá forward secrecy.
- `certificado.md` com os **sete** campos, extraídos com `openssl`.
- Você explicou por que o **`CN` não basta** e o que substituiu.
- Você demonstrou **cadeia válida ≠ não-expirado**, com `-attime`.
- `cadeia.md` com os elos e a resposta sobre o **arquivo do servidor**.
- Você explicou por que a **raiz não vai** no arquivo de cadeia.
- `cadeado.md` com as dez coisas e a busca no código.
- Você explicou por que **cifra anônima é pior que HTTP**.
- `valida-tls.py` rodando, com os **três** contextos.
- Você identificou **qual dos três permite MITM**.
- `enumera-tls.sh` rodando contra o **seu** servidor.
- Você identificou **quantos achados** no seu teste.
- `config-segura.conf` com as **oito** seções.
- Você explicou por que **ECDHE e AEAD são obrigatórios**.
- `regra-tls.md` com as **três** seções.
- ⚠ **Nenhum teste contra servidor de terceiro.**

---

## Avaliação

1. Descreva o handshake do TLS 1.3, e o que **cada passo resolve**.
2. **Como o TLS 1.3 dá forward secrecy sempre?**
3. **O que o `CertificateVerify` resolve** que o ECDH não resolve?
4. Cite **cinco** diferenças do TLS 1.3 para o 1.2.
5. Por que a **compressão foi removida**?
6. O que o **0-RTT** arrisca, e quando é aceitável?
7. Diferencie **SAN** de **CN**. Por que o CN não basta?
8. O que **`CA:TRUE` num leaf** permite de errado?
9. Para que serve o **`Authority Key Identifier`**?
10. **Cadeia válida implica não-expirado?** Explique como verificar as duas.
11. Por que a **raiz não vai** no arquivo do servidor?
12. **Quantos certificados** o arquivo de cadeia deve ter, e em que ordem?
13. Cite **cinco coisas que o cadeado NÃO garante**.
14. Por que **MITM corporativo não remove o cadeado**?
15. Cite a flag de validação desligada em **cinco** linguagens.
16. **Por que cifra anônima (ADH) é pior que HTTP sem TLS?**
17. **O que o HSTS impede** que a config de servidor não impede?
18. Por que `ssl_session_tickets off` ajuda o forward secrecy?
19. **Por que a revogação frequentemente não é detectada**, e o que resolveu isso?
20. Qual a **correção de uma linha** de maior impacto em TLS?

---

**Próximo:** [Módulo 7 — As cinco classes de falha](modulo-07.md)
