# Módulo 7 — Análise Dinâmica e Observação

**Curso:** iOS Security Research: Internals e Engenharia Reversa
**Módulo:** 7 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 6
**Próximo:** Módulo 8 — Depuração e instrumentação

---

## O que este módulo entrega

Ao final, você vai saber **confirmar na execução** o que a leitura estática levantou — e observar o app **sem entrar nele**. Você vai conhecer as camadas de observação do iOS, e vai saber **o que cada uma alcança em cada nível de laboratório**.

---

## 7.1 As camadas de observação

⚠ **Cinco níveis, do mais barato ao mais invasivo — e o iOS tem particularidades em cada um:**

| Nível | ⚠ O que mostra | ⚠ Exige |
|---|---|---|
| **Console / `os_log`** | O que o app **escreve** | ⚠ Nada — mas o app decide escrever |
| ⚠ **Arquivos do container** | O que **persistiu** | ⚠ A |
| ⚠ **Tráfego** | O que **sai e entra** | ⚠ A + proxy |
| ⚠ **`syscall` / `dtrace`** | ⚠ O que o app **pede ao kernel** | ⚠ ⚠ B (SIP/jailbreak) |
| **`lldb` / `Frida`** | ⚠ ⚠ **Valores em memória** | ⚠ ⚠ B |

⚠ **A frase que organiza o módulo:**

> **Comece pelo que o app deixa no sistema. Só depois entre nele.**

⚠ **E a diferença em relação ao Android é concreta:** ⚠ lá, `logcat` e `strace` funcionam com `adb` e pouca cerimônia. ⚠ Aqui, ⚠ **o `syscall` exige `dtrace`, que exige SIP desabilitado** — e ⚠ **o `Console` só mostra o que o app escreve via `os_log`**.

⚠ **A consequência para o laboratório:** ⚠ boa parte da observação dinâmica **exige Nível B** — e isso é **conteúdo**, não nota de rodapé. ⚠ O módulo 10 detalha o que cada nível alcança.

---

## 7.2 O Console: o que o app diz de si

⚠ **O `os_log` substituiu o `NSLog`, e a diferença muda a observação:**

| | `NSLog` (antigo) | ⚠ **`os_log`** (atual) |
|---|---|---|
| Onde vai | Console do sistema | ⚠ ⚠ **Subsistema próprio** |
| Visível sempre | ⚠ Sim | ⚠ ⚠ **Só se o nível permitir** |
| Filtrável | Por texto | ⚠ **Por subsistema e categoria** |
| ⚠ Dado sensível | ⚠ ⚠ **Aparece** | ⚠ **Pode ser marcado como privado** |

⚠ **A segunda linha é a que engana:** ⚠ logs de `os_log` **não aparecem** por padrão em produção — só em desenvolvimento ou com configuração de diagnóstico. ⚠ Um analista que "não vê log" pode estar diante de **log que existe e não é exibido**.

⚠ **A quarta é a boa notícia, e a má:** ⚠ a `API` permite marcar dado como **privado** (`%{private}@`) — e aí ele **não aparece**. ⚠ Mas isso é **opcional**, e ⚠ apps que não marcam **vazam** o dado no log.

```bash
# ── NÍVEL A — o Console do simulador ───────────────────────
#    ⚠ rode o app e capture a saida
xcrun simctl spawn booted log stream \
  --predicate 'process == "MeuApp"' --level debug 2>/dev/null | head -40

# ⚠ o log JÁ registrado
xcrun simctl spawn booted log show --last 5m \
  --predicate 'process == "MeuApp"' 2>/dev/null | tail -50
```

```bash
# ── NÍVEL B — no aparelho ──────────────────────────────────
#    ⚠ Mac + device pareado
xcrun devicectl device info 2>/dev/null | head
#    ⚠ e o log, quando o app roda:
#    xcrun devicectl device process launch --console com.exemplo.app
```

⚠ **A consulta do `log show` é a de maior rendimento:** ⚠ ela traz o que o app **e o sistema sobre ele** escreveram — incluindo **`sandbox` deny**, que é o análogo do `avc: denied` do Android.

```bash
# ⚠ A NEGACAO do sandbox — o analogo do avc: denied
xcrun simctl spawn booted log show --last 5m \
  --predicate 'eventMessage CONTAINS "deny"' 2>/dev/null | grep -i sandbox | head -10

# ⚠ e o dado sensivel no log (no simulador, do app proprio)
xcrun simctl spawn booted log show --last 5m \
  --predicate 'process == "MeuApp"' 2>/dev/null | \
  grep -iE 'token|password|senha|secret|cpf' | head
```

⚠ **A segunda consulta é o primeiro achado possível do módulo** — e não exige `jailbreak`. ⚠ Se o app **imprime** o token, o achado vale em **aparelho comum**, com o Perfil de desenvolvimento.

---

## 7.3 O container: o dado que fica

⚠ **O que a execução deixa, e onde olhar — no simulador e no aparelho:**

```bash
# ── NÍVEL A — o container do simulador ────────────────────
CT=$(xcrun simctl get_app_container booted com.exemplo.app data 2>/dev/null)
echo "container: $CT"

# ⚠ tudo que mudou depois da execucao
find "$CT" -type f -newer /tmp/marca 2>/dev/null | head -20
#    ⚠ (crie /tmp/marca antes de rodar o app)

# ⚠ e o conteudo
find "$CT/Library/Preferences" -name '*.plist' -exec plutil -p {} \;
find "$CT/Library/Application Support" -type f | head
```

```bash
# ── NÍVEL B — no aparelho ─────────────────────────────────
#    ⚠ o container so' e' alcancavel com perfil de dev + ferramenta,
#      ou com jailbreak.
#    ⚠ e a FORMA mais direta: pelo proprio app (codigo), ou pelo
#      "Devices and Simulators" do Xcode para baixar o container.
xcrun devicectl device copy from --device <ID> \
  --source /var/mobile/Containers/Data/Application/<UUID>/Documents \
  --destination ./docs 2>/dev/null || echo "(⚠ exige perfil/jailbreak)"
```

⚠ **O instrumento que o curso usa, e ele funciona nos dois níveis:** ⚠ **`find -newer`** — você marca o tempo, roda o app, e vê **exatamente o que mudou**. ⚠ É o análogo do `strace` no `openat` (módulo 6 do curso de Android): ⚠ **o que o app tocou**, sem ler código.

⚠ **E no aparelho há uma via formal:** ⚠ o Xcode permite **baixar o container** de um app em desenvolvimento. ⚠ É observação **legítima**, sem `jailbreak` — e é o que o Nível B oferece sem comprometer o aparelho.

---

## 7.4 O tráfego

⚠ **A camada mais reveladora, e o Curso 3 a aprofunda. Aqui, o essencial:**

```
   APP ──► ⚠ HTTPS ──► SERVIDOR

   PARA VER O CONTEUDO, uma das tres:
     1. proxy + CA instalada E CONFIADA   ⚠ o app precisa aceitar
     2. ⚠ `NSAllowsArbitraryLoads`          (modulo 2 — achado)
     3. ⚠ hook no ponto de confianca        (modulo 8)
```

⚠ **A segunda linha é uma ponte entre módulos, e vale notar:** ⚠ `NSAllowsArbitraryLoads` **não permite interceptar** — ela permite **HTTP em claro**. ⚠ Mas ela é **achado por si** (módulo 2), e a sua presença **facilita** ver o tráfego.

⚠ **E a terceira é o que o módulo 8 resolve:** ⚠ com **pinning**, o proxy **não funciona** — e a resposta é instrumentar **onde a confiança é avaliada**.

```bash
# ── A configuracao do proxy, no simulador ─────────────────
#    ⚠ no Mac: mitmproxy -p 8080
#    ⚠ e o simulador usa a config de rede do host

# ── O teste: o app aceita? ────────────────────────────────
#    ⚠ rode o app com o proxy ativo e observe
xcrun simctl spawn booted log show --last 2m \
  --predicate 'process == "MeuApp"' 2>/dev/null | \
  grep -iE 'SSL|TLS|trust|certificate|handshake' | head -10
#    ⚠ mensagem de erro de TLS = o app RECUSOU
```

```bash
# ── ⚠ MESMO SEM DECIFRAR: para onde o app fala ────────────
#    no simulador, o processo usa a rede do host
lsof -i -n -P 2>/dev/null | grep -i MeuApp | head
#    ⚠ destino e porta, sem TLS

#    e no aparelho (nivel B, com ferramenta de rede):
#    ⚠ a captura de pacote mostra SNI e destino
```

⚠ **A primeira consulta é diagnóstica e é a mesma do curso de Android:** ⚠ quando o app **recusa** o proxy, a mensagem no log diz **por quê** — e é o **ponto de partida** para o módulo 8.

---

## 7.5 `dtrace`: a camada que o iOS dificulta

⚠ **A comparação direta com o Android, e ela é o que este módulo precisa declarar:**

| | Android | ⚠ iOS |
|---|---|---|
| Ver syscall | ⚠ `strace` com `root` | ⚠ ⚠ **`dtrace` com SIP off** |
| Ver arquivo aberto | ⚠ `strace openat` | ⚠ `dtrace` ou **`fs_usage`** |
| Ver rede | `/proc/net/tcp` | ⚠ `nettop` / `lsof` |
| ⚠ Ver processo | `ps` | ⚠ `ps`, `launchctl` |

⚠ **A primeira linha é a diferença que mais custa:** ⚠ no Android, `strace` roda com `root` no aparelho. ⚠ Aqui, ⚠ **`dtrace` exige desabilitar `SIP`** — e ⚠ **no aparelho, ela é restrita de qualquer forma**. ⚠ É por isso que a observação de syscall em iOS **não é o caminho principal**: ⚠ o caminho é **instrumentação** (módulo 8).

⚠ **O que **funciona** sem `dtrace`, e vale usar:**

```bash
# ⚠ fs_usage — arquivos, sem dtrace (no Mac; no simulador ajuda)
sudo fs_usage -w -f filesys MeuApp 2>/dev/null | head -20

# ⚠ nettop — conexoes, sem dtrace
nettop -p MeuApp -l 1 2>/dev/null | head -15

# ⚠ e o basico
ps aux | grep -i MeuApp
lsof -p $(pgrep -x MeuApp | head -1) 2>/dev/null | head -20
```

⚠ **A terceira e o `lsof` são o que substitui o `/proc`:** ⚠ `lsof -p` mostra **arquivos abertos e conexões** de um processo — e é a informação que o `strace openat` daria. ⚠ Não é tão completo, e funciona **sem comprometer o sistema**.

⚠ **A leitura honesta para o relatório:** ⚠ em iOS, a observação de baixo nível é **mais restrita** que no Android. ⚠ O que se ganha em troca é **instrumentação mais uniforme** (módulo 3: toda mensagem é indireção).

---

## 7.6 O método: confirmar a hipótese

⚠ **O ciclo, e ele liga o módulo 6 a este:**

```
   HIPOTESE (modulo 6)              ⚠ CONFIRMACAO (aqui)
   ───────────────────              ────────────────────

   "openURL nao valida origem"  ──► invoque por URL e observe
   "o token esta em .plist"     ──► ⚠ leia o plist apos a execucao
   "nao ha pinning"             ──► coloque proxy e veja o trafego
   "ha deteccao de jailbreak"   ──► ⚠ rode em aparelho limpo e observe

   ⚠ Se o efeito NAO ocorre:
       hipotese errada, OU
       ⚠ a protecao existe (modulo 9)
```

⚠ **A última linha é a mesma do módulo 6 do curso de Android:** ⚠ "não funcionou" tem **duas** causas — e confundi-las é **falso negativo**.

⚠ **Como invocar por URL, nos dois níveis:**

```bash
# ── NÍVEL A — simulador ───────────────────────────────────
xcrun simctl openurl booted "meuapp://perfil?id=42"
#    ⚠ e observe o log e o container

# ── NÍVEL B — aparelho ────────────────────────────────────
xcrun devicectl device process launch --device <ID> \
  com.exemplo.app "meuapp://perfil?id=42" 2>/dev/null
#    ⚠ a sintaxe varia por versao do Xcode
```

⚠ **A segunda linha é a que testa a hipótese central deste curso:** ⚠ se o app **aceita** o parâmetro e **mostra o perfil de outro**, o achado está confirmado — e ⚠ o **`id=42`** é a evidência.

⚠ **O que registrar, sempre:**

| Item | ⚠ Por quê |
|---|---|
| ⚠ **Nível (A ou B)** | ⚠ ⚠ **Determina o que o achado vale** |
| Versão do iOS / simulador | ⚠ Comportamento muda |
| ⚠ **Como invoquei** | ⚠ Reproduzível |
| ⚠ **A saída bruta** | ⚠ Evidência, não resumo |
| ⚠ **Se houve contorno** | ⚠ Muda a interpretação |

---

## Laboratório 7 — Observar a execução

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Nível A para tudo; o Nível B está marcado onde muda.**

```bash
mkdir -p ~/ios-lab/m07 && cd ~/ios-lab/m07

# ── 0. O alvo, no simulador ───────────────────────────────
xcrun simctl list devices booted
#    ⚠ instale o SEU app de laboratorio no simulador:
#    xcrun simctl install booted /caminho/MeuApp.app
xcrun simctl launch booted com.exemplo.app
touch /tmp/marca_m07          # ⚠ marca o tempo
```

```bash
# ── 1. CONSOLE — o que o app diz, e o sistema sobre ele ────
xcrun simctl spawn booted log stream --level debug \
  --predicate 'process == "MeuApp"' 2>/dev/null | head -40 &
LOGPID=$!

# ⚠ provoque — pelo caminho previsto E pelo NAO previsto
sleep 2
xcrun simctl openurl booted "meuapp://perfil?id=2"
sleep 2
xcrun simctl openurl booted "meuapp://perfil?id=1"

sleep 3; kill $LOGPID 2>/dev/null

# ⚠ o log registrado
xcrun simctl spawn booted log show --last 5m \
  --predicate 'process == "MeuApp"' 2>/dev/null | tail -40 > _console.txt
```

```bash
# ── 2. ⚠ SANDBOX DENY — o analogo do avc: denied ───────────
xcrun simctl spawn booted log show --last 5m 2>/dev/null | \
  grep -iE 'sandbox|deny' | head -10
#    ⚠ se aparecer, diz QUAL operacao foi negada
```

```bash
# ── 3. ⚠ DADO SENSIVEL NO LOG ─────────────────────────────
grep -iE 'token|password|senha|secret|cpf|@' _console.txt | head
#    ⚠ achado que vale em aparelho COMUM — nao exige jailbreak
```

```bash
# ── 4. O CONTAINER — o que mudou depois da execucao ───────
CT=$(xcrun simctl get_app_container booted com.exemplo.app data 2>/dev/null)
echo "container: $CT"

echo "══ arquivos tocados depois da marca"
find "$CT" -type f -newer /tmp/marca_m07 2>/dev/null | head -20

echo "══ preferencias (⚠ flag de autorizacao?)"
find "$CT/Library/Preferences" -name '*.plist' -exec sh -c \
  'echo "── $1"; plutil -p "$1"' _ {} \; 2>/dev/null | head -30

echo "══ bancos"
find "$CT" -name '*.sqlite' -o -name '*.db' 2>/dev/null | while read db; do
  echo "-- $db"; sqlite3 "$db" ".tables" 2>/dev/null
done
```

```bash
# ── 5. ⚠ O TRÁFEGO — para onde ele fala ──────────────────
lsof -i -n -P 2>/dev/null | grep -i MeuApp | head

# ⚠ e com proxy ativo (mitmproxy no Mac), o app ACEITA?
#    ⚠ observe o log por erro de TLS
xcrun simctl spawn booted log show --last 2m 2>/dev/null | \
  grep -iE 'SSL|trust|certificate' | head -5
```

```bash
# ── 6. ⚠ NÍVEL B — o que muda ────────────────────────────
cat <<'EOF'
No APARELHO (nivel B):
  - o Console mostra o MESMO, mas do aparelho
  - o container e' alcancavel via Xcode (Devices) ou jailbreak
  - ⚠ a Data Protection e' REAL (o simulador nao implementa)
  - ⚠ o Keychain e' REAL (o simulador nao tem SEP)
EOF
```

```bash
# ── 7. O REGISTRO ─────────────────────────────────────────
cat > evidencia.md <<'EOF'
# Confirmacao dinamica — <app>
Nivel: A (simulador) | B (dispositivo) · iOS:
| Hip. | Como provoquei | ⚠ Efeito observado | Veredito |
|------|----------------|--------------------|----------|
## ⚠ Dado sensivel encontrado no log
## ⚠ Hipoteses NAO confirmadas — e por que
EOF
```

**O que observar:** no passo 3, a busca por dado sensível no log — ⚠ é o achado que **não exige `jailbreak`**, e vale em aparelho comum. ⚠ E no passo 4, o `find -newer` mostra **exatamente** o que o app tocou durante a execução: ⚠ é o `strace openat` do iOS, sem comprometer o sistema.

**Exercício 1:** complete o `evidencia.md` com pelo menos **duas** hipóteses confirmadas, cada uma com **como provoquei** e **o efeito observado**. ⚠ A coluna `Nível` é obrigatória.

**Exercício 2:** invoque pelo URL scheme com **três** valores diferentes de `id` e registre o comportamento de cada um. ⚠ O app mostrou dado de outro? Verificou origem? Validou o parâmetro?

**Exercício 3 (o que vale):** para cada hipótese **não** confirmada, decida entre **"hipótese errada"** e **"proteção existe"** — e diga **qual comando** distinguiria as duas. ⚠ Depois escreva o que **só o Nível B** poderia responder, e por quê.

---

## Resumo

- ⚠ **Comece por fora:** Console, container, tráfego — antes de entrar no processo.
- ⚠ **`os_log` não aparece por padrão**, e o dado pode ser marcado como **privado** — ou não.
- ⚠ **O log com dado sensível é achado que vale em aparelho COMUM.**
- ⚠ **`sandbox deny` é o `avc: denied` do iOS** — e a consulta ao log mostra qual operação foi negada.
- ⚠ **`find -newer` mostra o que o app tocou** — é o `openat` do iOS, sem comprometer o sistema.
- ⚠ **`dtrace` exige SIP off** e é restrita no aparelho — em iOS, o caminho é **instrumentação**.
- ⚠ **`lsof -p` e `nettop` substituem o `/proc`** — sem `dtrace`.
- ⚠ **"Não funcionou" tem duas causas** — hipótese errada ou proteção — e confundi-las é falso negativo.
- ⚠ **O nível (A/B) é obrigatório no registro** — determina o que o achado vale.

---

## O que o próximo módulo entrega

Você sabe confirmar comportamento. O módulo 8 ensina a **entrar no processo**: `lldb`, `Frida` e `method swizzling` — e o que a instrumentação **prova e não prova**.
