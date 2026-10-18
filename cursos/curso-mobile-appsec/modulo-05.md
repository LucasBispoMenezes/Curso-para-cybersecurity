# Módulo 5 — Validação de TLS e `Pinning`

**Curso:** Mobile Application Security: Análise e Pesquisa de Vulnerabilidades
**Módulo:** 5 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 4
**Próximo:** Módulo 6 — `Deep links`, `WebView` e componentes

---

## O que este módulo entrega

Ao final, você vai saber **avaliar a proteção do caminho** — o que a validação de TLS garante, o que o `pinning` cobre, e **o que passa por fora dos dois**. É o módulo em que a pergunta deixa de ser "tem pinning?" e passa a ser **"o pinning cobre tudo?"**.

---

## 5.1 O que o TLS garante, e o que ele não garante

⚠ **A distinção que organiza o módulo, e ela é a do módulo 6 do curso de Web Apps:**

| ✅ TLS garante | ⚠ TLS **não** garante |
|---|---|
| Confidencialidade em trânsito | ⚠ ⚠ **Que o app no outro lado é íntegro** |
| Integridade em trânsito | ⚠ Que o certificado é de quem deveria |
| ⚠ **Autenticidade do SERVIDOR** | ⚠ ⚠ **Que o app validou o certificado** |
| — | ⚠ Que não há **outra** conexão |
| — | ⚠ Que o dado no **dispositivo** está protegido |

⚠ **A terceira linha é o ponto:** ⚠ o TLS autentica **o servidor** — ⚠ e **nada** diz sobre o app. ⚠ Isso importa porque **o app é do cliente** (módulo 1): ⚠ ele pode desligar a validação, e o TLS continua "funcionando".

⚠ **E a quarta linha é o achado mais comum deste módulo:** ⚠ a validação de certificado está **no app** — ⚠ e o app pode ser alterado. ⚠ O que muda com `pinning` é **o custo** de alterar, não a possibilidade.

⚠ **A frase que organiza o módulo:**

> **TLS protege o caminho contra quem está no meio. `Pinning` protege contra a CA errada.
> Nenhum dos dois protege contra o dono do aparelho.**

---

## 5.2 A cadeia de validação

⚠ **O que acontece quando o app conecta, e onde cada coisa pode falhar:**

```
   APP ──► ⚠ 1. handshake ──► SERVIDOR
             │
             ├─ 2. o certificado e' de uma CA confiavel?
             ├─ 3. o nome (SAN) bate com o host?
             ├─ 4. o certificado nao expirou?
             ├─ 5. ⚠ e' o certificado ESPERADO?  (pinning)
             └─ 6. a cadeia completa valida?
```

⚠ **Os cinco primeiros passos são **padrão**, e o app pode sobrescrever cada um:**

| Passo | ⚠ Como o app pode quebrar |
|---|---|
| 2 e 6 | ⚠ `TrustManager` que aceita tudo |
| 3 | ⚠ Desligar a verificação de host |
| 4 | ⚠ Ignorar validade |
| ⚠ 5 | ⚠ ⚠ **É o passo que o `pinning` adiciona** |

⚠ **O `TrustManager` que aceita tudo é o achado clássico — e o mais fácil de achar:**

```java
// ANDROID — ⚠ o padrao "resolve o problema de certificado"
TrustManager[] confia = new TrustManager[] {
    new X509TrustManager() {
        public void checkClientTrusted(X509Certificate[] c, String a) { }
        public void checkServerTrusted(X509Certificate[] c, String a) { }   // ⚠ VAZIO
        public X509Certificate[] getAcceptedIssuers() { return null; }
    }
};
SSLContext ctx = SSLContext.getInstance("TLS");
ctx.init(null, confia, new SecureRandom());    // ⚠ aceita QUALQUER certificado
```

```swift
// iOS — ⚠ o mesmo defeito, em delegate
func urlSession(_ s: URLSession, didReceive c: URLAuthenticationChallenge,
                completionHandler: @escaping (URLSession.AuthChallengeDisposition,
                                              URLCredential?) -> Void) {
    let cred = URLCredential(trust: c.protectionSpace.serverTrust!)  // ⚠ SEM validar
    completionHandler(.useCredential, cred)
}
```

⚠ **A detecção é direta, e nos três lugares:**

```bash
# ── 1. No codigo (estatico) ────────────────────────────────
# ANDROID:
grep -rniE 'TrustManager|checkServerTrusted|ALLOW_ALL|'\
'HostnameVerifier|setDefaultHostnameVerifier' ~/android-lab/m05/app_jadx/sources/ 2>/dev/null | head

# iOS:
strings -n 6 ~/ios-lab/m02/ipa/Payload/*.app/MeuApp 2>/dev/null | \
  grep -iE 'trust|serverTrust|didReceive|ALLOW' | head

# ── 2. No comportamento (dinamico) — ⚠ o metodo que importa ─
#    ⚠ coloque o proxy com CA NAO confiavel:
#      - se o app ACEITA -> a validacao esta desligada
#      - se o app RECUSA -> ha validacao (ou pinning)
```

⚠ **O teste do passo 2 é o que produz resposta, e ele é simples:** ⚠ um proxy com **CA própria, não instalada** — ⚠ se o app **aceita**, a validação está **desligada**. ⚠ Se **recusa**, há validação — ⚠ e a pergunta seguinte é se há **pinning**.

---

## 5.3 `Pinning`: o que ele cobre

⚠ **Três formas, e cada uma cobre uma coisa diferente:**

| Forma | ⚠ O que fixa | ⚠ Cobre |
|---|---|---|
| **Certificado** | ⚠ O certificado exato | ⚠ ⚠ Só até ele renovar |
| **Chave pública** | ⚠ A chave da CA ou do servidor | ⚠ Melhor — sobrevive à renovação |
| ⚠ **Conjunto de chaves** | ⚠ Várias chaves esperadas | ✅ O recomendado |

⚠ **A primeira linha explica por que o `pinning` de certificado é frágil:** ⚠ ele **quebra** quando o certificado é renovado — ⚠ e a equipe **remove o pinning** para resolver. ⚠ É o padrão que o curso cobra: ⚠ **a proteção mais forte é a que foi desligada por operação**.

⚠ **O que o `pinning` faz, dito com precisão:** ⚠ ele **reduz o conjunto de certificados aceitos** — ⚠ de "qualquer um de uma CA confiável" para "este específico". ⚠ Isso **impede** o proxy com CA instalada, e ⚠ **impede** a CA comprometida. ⚠ Não impede mais nada.

⚠ **E o que ele **não** cobre — a parte que o relatório precisa:**

| ⚠ O pinning não cobre | ⚠ Por quê |
|---|---|
| ⚠ **Conexões que ele não protege** | ⚠ Só vale onde foi aplicado |
| ⚠ **Bibliotecas de terceiro** | ⚠ Cada uma tem a própria pilha |
| ⚠ **`WebView`** | ⚠ ⚠ **O navegador embutido não usa a pilha do app** |
| ⚠ **Tráfego de SDK de analytics** | ⚠ Pilha própria |
| ⚠ **O dono do aparelho** | ⚠ ⚠ **Ele pode alterar o app** |

⚠ **A terceira é o achado mais frequente deste módulo:** ⚠ o app fixa o certificado da **API principal** — ⚠ e o `WebView`, o SDK de anúncio e a chamada de telemetria **passam por fora**. ⚠ O módulo 6 trata o `WebView`; aqui, o que importa é: ⚠ **pinning parcial é o normal, e o resto é achado**.

```bash
# ── ⚠ O MAPA DOS DESTINOS — e quem esta protegido ─────────
#    ⚠ liste TODOS os hosts que o app contata
jadx -d app_jadx ~/android-lab/alvo/app.apk 2>/dev/null || true
grep -rhoE 'https?://[a-zA-Z0-9.-]+' app_jadx/sources/ 2>/dev/null | \
  sed 's|https\?://||' | sort -u > _hosts.txt
cat _hosts.txt

strings -n 8 ~/ios-lab/m02/ipa/Payload/*.app/MeuApp 2>/dev/null | \
  grep -oE 'https?://[a-zA-Z0-9.-]+' | sed 's|https\?://||' | sort -u >> _hosts.txt

echo "══ ⚠ quantos hosts?"
sort -u _hosts.txt | wc -l

echo "══ ⚠ quais estao PINADOS?"
grep -rniE 'CertificatePinner|pin|sha256/|SPKI|NSExceptionDomains' \
  app_jadx/sources/ 2>/dev/null | head
```

⚠ **A comparação entre as duas saídas é o achado:** ⚠ **N hosts contatados**, ⚠ e **M pinados**. ⚠ A diferença é a superfície **não protegida** — ⚠ e é onde o proxy **funciona**.

---

## 5.4 O que se mede

⚠ **O instrumento, e ele tem três medidas:**

```
   PARA CADA DESTINO:

   1. O app valida o certificado?       ⚠ CA nao confiavel -> aceita?
   2. Ha pinning neste destino?         ⚠ CA confiavel + pin -> recusa?
   3. ⚠ O pinning cobre TODA a conexao?  ⚠ ha trafego por fora?
   ────────────────────────────────────────────────────────
   RESULTADO:  validado | ⚠ so' com pin | ⚠ SEM validacao | nao alcancado
```

⚠ **A linha `SEM validação` é o achado crítico:** ⚠ significa que o tráfego **pode ser lido e alterado** por quem estiver no caminho — ⚠ com uma CA qualquer. ⚠ E o teste é o do 5.2: ⚠ **proxy com CA não confiável**.

⚠ **E a linha `não alcançado` é resultado legítimo:** ⚠ alguns destinos só são contatados em condição específica (login, compra, push). ⚠ O relatório **declara** — ⚠ não inventa.

⚠ **A tabela que o laboratório preenche:**

| Destino | ⚠ Valida? | Pinado? | ⚠ Cobre tudo? | Veredito |
|---|---|---|---|---|
| `api.exemplo.com` | sim | sim | ⚠ **não** — WebView por fora | ⚠ parcial |
| `cdn.exemplo.com` | ⚠ ? | não | — | ⚠ **sem pin** |
| `analytics.terceiro.com` | ⚠ ? | não | — | ⚠ **SDK** |
| `gateway.pagamento.com` | sim | sim | sim | ✅ |

⚠ **O veredito `parcial` é o mais informativo** — e é o que o relatório precisa escrever: ⚠ *"há pinning na API principal; as demais conexões não são protegidas, e `X` aceita certificado não confiável"*.

---

## 5.5 A linha do curso

⚠ **A delimitação, e ela é a do módulo 8 do Curso 1 e do módulo 9 do Curso 2:**

| A proteção de transporte... | ⚠ Veredito |
|---|---|
| **Impede** o atacante de rede casual? | ⚠ Sim — o pinning encarece muito |
| ⚠ **Impede** o dono do aparelho? | ⚠ ⚠ **Não** — ele altera o app |
| ⚠ **Impede** o app malicioso? | ⚠ Depende do que ele alcança (módulo 6) |
| ⚠ **Substitui** a verificação no servidor? | ⚠ ⚠ **Nunca** |

⚠ **A última linha é a conclusão do módulo, e ela repete o curso inteiro:** ⚠ `pinning` protege **o caminho** — ⚠ e o achado que importa continua sendo **o que o servidor confia** (módulo 4). ⚠ Um app com pinning impecável e servidor que **aceita o preço do cliente** é um app **inseguro**.

⚠ **E o contrário também vale, e o relatório precisa do equilíbrio:** ⚠ pinning **parcial** com servidor **correto** é um achado **menor** — ⚠ porque o dano do caminho é **interceptação**, e não há credencial de longa duração exposta. ⚠ A gravidade vem da **combinação**, não da ausência isolada.

---

## Laboratório 5 — Medir TLS e pinning

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Exige o servidor do módulo 1 e o proxy.**

```bash
mkdir -p ~/mobile-lab/m05 && cd ~/mobile-lab/m05
```

```bash
# ── 1. O MAPA DOS DESTINOS ─────────────────────────────────
jadx -d app_jadx ~/android-lab/alvo/app.apk 2>/dev/null || true
grep -rhoE 'https?://[a-zA-Z0-9.-]+' app_jadx/sources/ 2>/dev/null | \
  sed 's|https\?://||' | sort -u | tee _hosts.txt

# ⚠ e o que o iOS contata
strings -n 8 ~/ios-lab/m02/ipa/Payload/*.app/MeuApp 2>/dev/null | \
  grep -oE 'https?://[a-zA-Z0-9.-]+' | sed 's|https\?://||' | sort -u
```

```bash
# ── 2. ⚠ O QUE ESTA NO CODIGO — validacao e pinning ───────
echo "══ validacao de certificado (⚠ defeitos)"
grep -rniE 'TrustManager|checkServerTrusted|setDefaultHostnameVerifier|'\
'ALLOW_ALL|HostnameVerifier' app_jadx/sources/ 2>/dev/null | head

echo "══ pinning (⚠ o que esta protegido)"
grep -rniE 'CertificatePinner|sha256/|SPKI|pin\(|'\
'NSExceptionDomains|NSAppTransportSecurity|NSPinnedDomains' \
  app_jadx/sources/ 2>/dev/null | head

echo "══ ATS no iOS"
plutil -extract NSAppTransportSecurity xml1 -o - \
  ~/ios-lab/m02/ipa/Payload/*.app/Info.plist 2>/dev/null | head -20
```

```bash
# ── 3. ⚠ O TESTE DINAMICO — a CA nao confiavel ────────────
#    ⚠ o instrumento do modulo:
cat <<'EOF'
══ O TESTE, em tres passos:

1. rode o app SEM proxy          -> funciona (baseline)
2. rode com proxy e CA INSTALADA -> ⚠ se RECUSA, ha pinning
3. rode com proxy e CA NAO instalada -> ⚠ se ACEITA, nao valida

  → inicio do proxy:
      mitmproxy -p 8080
  → Android:
      adb reverse tcp:8080 tcp:8080
      adb shell settings put global http_proxy 127.0.0.1:8080
  → iOS (simulador): usa a rede do host
EOF

echo "══ e o log, para ver a recusa"
adb logcat -c 2>/dev/null
xcrun simctl spawn booted log show --last 2m 2>/dev/null | \
  grep -iE 'SSL|trust|certificate|pin' | head
```

```bash
# ── 4. ⚠ O TRÁFEGO QUE PASSA POR FORA ─────────────────────
grep -rniE 'WebView|loadUrl|WKWebView|loadRequest' app_jadx/sources/ 2>/dev/null | head
#    ⚠ o WebView NAO usa a pilha do app -> ⚠ o pinning nao vale nele

grep -rniE 'HttpURLConnection|OkHttp|URLSession|'\
'analytics|firebase|crashlytics|appsflyer|adjust' \
  app_jadx/sources/ 2>/dev/null | head
#    ⚠ cada biblioteca tem a PROPRIA pilha
```

```bash
# ── 5. A TABELA ───────────────────────────────────────────
cat > tls.md <<'EOF'
# TLS e pinning — <app>
| Destino | Valida? | Pinado? | ⚠ Cobre tudo? | Veredito |
|---------|---------|---------|---------------|----------|
## ⚠ Defeitos de validacao encontrados (TrustManager, delegate)
## ⚠ Trafego que passa FORA do pinning
## ⚠ Destinos nao alcancados (⚠ e por que)
EOF
```

**O que observar:** no passo 2, o `TrustManager` com `checkServerTrusted` **vazio** é o achado crítico — ⚠ e ele é **visível no código**, sem executar nada. ⚠ E no passo 4, o `WebView`: ⚠ ele é a razão mais comum de o pinning **não cobrir tudo** — ⚠ e o módulo 6 trata disso.

**Exercício 1:** complete a tabela do 5.4 com todos os destinos encontrados. ⚠ Preencha também os **não alcançados**, e diga por quê.

**Exercício 2:** encontre **um** defeito de validação (TrustManager, delegate, hostname verifier) e escreva a **frase de causa raiz** com o arquivo. ⚠ Depois corrija e explique **o que mudaria no comportamento**.

**Exercício 3 (o que vale):** liste o **tráfego que passa por fora** do pinning — `WebView`, SDK, telemetria. ⚠ Para cada um, responda: **ele carrega credencial?** ⚠ Se carregar, o achado é **crítico**; se não, é **menor**. ⚠ É o raciocínio de gravidade que o módulo 11 vai cobrar.

---

## Resumo

- ⚠ **TLS autentica o SERVIDOR** — e nada diz sobre o app.
- ⚠ **A validação de certificado está no app** — e o app pode ser alterado.
- ⚠ **`TrustManager` que aceita tudo é o achado clássico** — e é visível no código.
- ⚠ **`Pinning` reduz o conjunto de certificados aceitos** — de "qualquer CA" para "este".
- ⚠ **Pinning de certificado quebra na renovação** — e é removido por operação.
- ⚠ ⚠ **Pinning parcial é o normal:** o `WebView` e os SDKs **não usam** a pilha do app.
- ⚠ **Comparar hosts contatados com hosts pinados** é o achado mais direto do módulo.
- ⚠ **`Pinning` protege o caminho; não substitui a verificação no servidor.**
- ⚠ **A gravidade vem da combinação** — pinning parcial com servidor correto é achado menor.

---

## O que o próximo módulo entrega

Você sabe avaliar o caminho. O módulo 6 abre **a superfície de invocação**: `deep links`, `WebView` e a comunicação entre componentes — onde outro app alcança o seu.
