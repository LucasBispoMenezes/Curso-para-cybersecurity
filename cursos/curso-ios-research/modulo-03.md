# Módulo 3 — Objective-C, Swift e o Runtime

**Curso:** iOS Security Research: Internals e Engenharia Reversa
**Módulo:** 3 de 11 · 4 horas
**Pré-requisitos:** Módulos 1 e 2
**Próximo:** Módulo 4 — `Code signing` e `entitlements`

---

## O que este módulo entrega

Ao final, você vai entender **o runtime de Objective-C** — e por que ele é a razão de a instrumentação em iOS ser tão eficaz. Você vai saber **ler os metadados de classe e método** no binário, reconhecer **Swift** e o que ele esconde, e navegar um código que **não é chamada direta, e sim mensagem**.

---

## 3.1 Mensagem, e não chamada

⚠ **A diferença conceitual que explica tudo neste módulo:**

```
   CHAMADA DIRETA (C, Swift estatico)     MENSAGEM (Objective-C)
   ─────────────────────────────────      ──────────────────────

   ⚠ endereco FIXO no binario              ⚠ endereco RESOLVIDO
     calculado em tempo de compilacao        em RUNTIME

   call 0x100004a20                        objc_msgSend(alvo, seletor, args)
                                              │
                                              ▼
                                        ⚠ procura o metodo NA TABELA
                                          da classe, em runtime
```

⚠ **A frase que organiza o módulo:**

> **Em Objective-C, o nome do método está no binário e a resolução acontece em runtime — e é
> exatamente isso que torna a instrumentação possível.**

⚠ **Três consequências, e cada uma é uma ferramenta:**

| Consequência | ⚠ O que ela permite |
|---|---|
| ⚠ **O seletor é uma string** | ⚠ Você **lê** `"verificar:"` no binário |
| ⚠ **A classe tem metadados** | ⚠ Você **lista** os métodos de cada classe |
| ⚠ ⚠ **A resolução é em runtime** | ⚠ ⚠ **Você troca o método em execução** |

⚠ **A terceira é a base de todo o módulo 8:** ⚠ `method swizzling` e o `Frida` **substituem a implementação** — e o app **não percebe**, porque a resolução acontece a cada mensagem.

⚠ **E a razão de isso ser diferente do Android:** ⚠ lá, o hook de método Java existe, mas o **código nativo não tem esse luxo**. ⚠ Aqui, **o padrão da plataforma é a indireção** — e por isso a instrumentação é mais uniforme.

---

## 3.2 Ler os metadados: onde o código se denuncia

⚠ **Os dados de classe e método **estão no binário**, e há ferramenta para extraí-los:**

```bash
# ⚠ A lista de classes e metodos — sem decifrar nada, quando ha metadados
otool -oV MeuApp | head -60
#    ⚠ imprime: nome da classe, superclasse, ivars, metodos

# E a forma resumida — so' os nomes de metodo
otool -oV MeuApp | grep -oE 'name 0x[0-9a-f]+ [^ ]+' | head -30
#    ou, com ferramenta dedicada:
#    jtool2 -d --objc MeuApp

# ⚠ TODOS os seletores usados — inclui os chamados de outras classes
strings -n 4 MeuApp | grep -E '^[a-zA-Z_]+:$' | sort -u | head -40
```

⚠ **A terceira consulta é a mais rápida e a mais subestimada:** ⚠ seletores são strings, e um `grep` por `algo:` acha **qualquer** método chamado — inclusive de classes do sistema, e **inclusive os que o app usa**.

⚠ **E os nomes de classe contam a arquitetura do app:**

| Você ver | ⚠ O que revela |
|---|---|
| `ViewController`, `LoginViewController` | ⚠ Fluxo de tela |
| ⚠ **`NetworkClient`, `APIService`** | ⚠ ⚠ **Onde a rede acontece** |
| `KeychainHelper`, `CryptoManager` | ⚠ ⚠ **Onde o segredo mora** |
| **`RootDetection`, `JailbreakCheck`** | ⚠ A proteção — módulo 9 |
| `AppDelegate` | O ponto de entrada e os `URL handler` |

⚠ **A quarta linha é a que você procura primeiro**, quando o alvo tem proteção: ⚠ o nome da classe **denuncia** a defesa, e você não precisa de desmontagem para saber **que ela existe e onde**.

```bash
# ⚠ A busca da protecao — 30 segundos
strings -n 5 MeuApp | grep -iE 'jailbreak|root|cydia|frida|substrate|'\
'debugger|integrity|tamper|ptrace|hook' | sort -u | head -20
```

⚠ **É a mesma técnica que o módulo 10 do curso de Android usou nas strings do `.so`** — e aqui funciona igual, porque o mecanismo é o mesmo: ⚠ a proteção precisa **nomear o que procura**, e o nome fica no binário.

---

## 3.3 Swift: o que ele esconde

⚠ **Swift muda a análise, e o módulo precisa ser honesto sobre isso:**

| | Objective-C | ⚠ Swift |
|---|---|---|
| Resolução | ⚠ **Runtime** (mensagem) | ⚠ **Estática** (quando possível) |
| Nome no binário | ⚠ Legível | ⚠ ⚠ **Mangled** |
| Metadados | ⚠ `__objc_*` | ⚠ Próprios, mais complexos |
| Instrumentação | ⚠ Direta | ⚠ ⚠ **Mais difícil** |
| `@objc` | — | ⚠ **Reexpoõe** ao runtime ObjC |

⚠ **A segunda linha é a primeira barreira, e ela tem solução:** ⚠ Swift **mangla** os nomes, e o resultado é ilegível — mas **reversível**.

```
   ⚠ NOME MANGLED:
   $s9MeuApp13ValidadorC7verificaySbSSF
   │ │  └pacote─┘└classe─┘└metodo─┘└tipos─┘
   │ └─ ⚠ prefixo de Swift
   └─ $s

   ⚠ REVERSIVEL com `swift demangle` (incluido no Xcode)
```

```bash
# Os simbolos Swift, e a reversao do nome
nm -a MeuApp | grep '_$s' | head -20

# ⚠ desmanglar — o nome legivel
nm -a MeuApp | grep -oE '\$s[0-9A-Za-z_]+' | head -10 | while read s; do
  echo "$s  ->  $(swift demangle --compact "$s" 2>/dev/null)"
done
```

⚠ **A quinta linha do quadro é a que salva a análise:** ⚠ um método Swift marcado com **`@objc`** fica **exposto ao runtime de Objective-C** — e portanto **instrumentável como qualquer outro**. ⚠ E é comum: ⚠ tudo que é chamado por interface, por seletor ou por `NotificationCenter` **precisa** de `@objc`.

⚠ **A consequência prática, e ela é boa notícia:** ⚠ **a superfície de entrada de um app Swift tende a ser `@objc`** — porque é ela que responde a `UIApplication`, a URL scheme e a notificação. ⚠ Você instrumenta **onde o dado entra**, e isso costuma bastar.

```bash
# ⚠ Metodos expostos ao runtime ObjC, mesmo em app Swift
otool -oV MeuApp | grep -E 'name 0x' | grep -iE 'handle|open|url|did|will' | head
#    ⚠ esses sao os pontos de entrada alcancaveis de fora
```

---

## 3.4 O `AppDelegate` e a entrada

⚠ **O ponto de entrada do app, e onde a superfície se abre:**

```objectivec
// ⚠ O metodo que recebe URL de QUALQUER app
- (BOOL)application:(UIApplication *)app
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
    // ⚠ `url` vem de FORA — e `options` diz QUEM abriu
    NSString *alvo = url.host;                  // ⚠ dado externo
    NSDictionary *p = [self parse:url.query];   // ⚠ dado externo

    if ([alvo isEqualToString:@"perfil"]) {
        // ⚠ o app usa o parametro — e verifica?
        [self mostrarPerfil:p[@"user_id"]];
    }
    return YES;
}
```

⚠ **As três perguntas que o módulo instala, e que o módulo 5 vai cobrar:**

| Pergunta | ⚠ O achado se a resposta for ruim |
|---|---|
| ⚠ **O app verifica a ORIGEM?** | ⚠ Qualquer app pode invocar |
| ⚠ **Valida o PARÂMETRO?** | ⚠ Dado arbitrário entra |
| ⚠ **Verifica AUTORIZAÇÃO?** | ⚠ Ação em nome do usuário |

⚠ **A primeira é a que quase nunca aparece, e é a específica do iOS:** ⚠ `options[UIApplicationOpenURLOptionsSourceApplicationKey]` diz **qual app abriu** — e a maioria do código **ignora**. ⚠ É o equivalente exato do `Binder.getCallingUid()` do módulo 4 do curso de Android: **a informação existe, e ninguém lê**.

⚠ **A terceira é a que o Curso 3 investiga:** ⚠ um `deep link` que abre a tela de perfil **sem checar se aquele perfil é do usuário** é `IDOR` por URL scheme.

```bash
# ⚠ O que o app faz com a URL — o que procurar no binario
strings -n 5 MeuApp | grep -iE 'openURL|handleOpen|scheme|://' | head
otool -oV MeuApp | grep -iE 'openURL|continueUserActivity' | head
```

---

## 3.5 `App Group`: código compartilhado entre apps

⚠ **A fronteira que o Android também tem, e que aqui é por `entitlement`:**

```
   APP A ──┐                       ┌── APP B
           ├── ⚠ App Group ───────┤
           │   (mesmo entitlement) │
           ▼                       ▼
   /var/mobile/Containers/Shared/AppGroup/<UUID>/
   ⚠  OS DOIS APPS LEEM O MESMO DADO
```

⚠ **A pergunta de segurança, e ela é direta:** ⚠ **o que está no `App Group`?** ⚠ Se for preferência de UI, é aceitável. ⚠ Se for **token de sessão** ou **credencial**, então **o app mais fraco do grupo compromete o mais forte**.

⚠ **E a razão de isso ser achado neste curso e não no Android:** ⚠ aqui, o grupo é **declarado por `entitlement`** — e o entitlement está **no binário assinado**. ⚠ Você **vê** quais apps compartilham, sem executar nada.

```bash
# ⚠ Quem compartilha o grupo
codesign -d --entitlements - MeuApp.app 2>&1 | grep -A3 -i 'group'
#    ⚠ application-groups / com.apple.security.application-groups

# ⚠ e o que o codigo procura lá
strings -n 6 MeuApp | grep -iE 'AppGroup|group\.|sharedContainer' | head
```

⚠ **A segunda consulta liga os dois módulos:** ⚠ ela mostra **o caminho** que o app usa para chegar ao grupo — e é o que o módulo 5 vai mapear como armazenamento.

---

## 3.6 O que o runtime não esconde

⚠ **A tabela que fecha o módulo, e que sustenta o módulo 8:**

| ✅ O runtime **expõe** | ⚠ O runtime **esconde** |
|---|---|
| ⚠ **Nomes de classe e método** (ObjC) | ⚠ Nomes (Swift, se não `@objc`) |
| ⚠ **A tabela de métodos** | ⚠ Lógica **dentro** do método |
| ⚠ ⚠ **O ponto de substituição** | ⚠ ⚠ **Chamada direta** (C, Swift estático) |
| ⚠ Protocolo e conformidade | Implementações **inlined** |
| Variável de instância | ⚠ Dado **calculado** em runtime |

⚠ **A terceira linha é a que separa o que se instrumenta do que não se instrumenta:** ⚠ uma função **C pura** — ou um método Swift estatizado — **não passa pelo `objc_msgSend`**. ⚠ Ela existe no binário, e o caminho é outro: ⚠ **`Interceptor` no endereço**, não hook de método.

⚠ **E a quinta é a mesma do módulo 5 do curso de Android:** ⚠ dado calculado em runtime não está no binário — só a **execução** o revela.

⚠ **A conclusão do módulo, escrita para o relatório:** ⚠ a análise estática de um app iOS produz **a lista de métodos e a superfície de entrada** — e a conclusão sobreo **comportamento** exige o módulo 7 e o 8.

---

## Laboratório 3 — Ler o runtime

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Este lab é inteiramente estático.**

```bash
mkdir -p ~/ios-lab/m03 && cd ~/ios-lab/m03
cp -r ../m02/ipa ipa 2>/dev/null || unzip -o ../m02/MeuApp.ipa -d ipa >/dev/null
APP=$(find ipa/Payload -maxdepth 1 -name '*.app' | head -1)
BIN=$(find "$APP" -maxdepth 1 -type f -perm +111 | head -1)
echo "binario: $BIN"
```

```bash
# ── 1. ⚠ A LISTA DE CLASSES — a arquitetura do app ─────────
otool -oV "$BIN" 2>/dev/null | grep -E 'name ' | head -40

# ⚠ so' os nomes de classe
otool -oV "$BIN" 2>/dev/null | awk '/name 0x/{print $NF}' | sort -u | head -50
```

```bash
# ── 2. ⚠ OS SELETORES — a superficie, em strings ───────────
strings -n 4 "$BIN" | grep -E '^[a-zA-Z_][a-zA-Z0-9_]*:$' | sort -u > _sel.txt
wc -l _sel.txt
head -40 _sel.txt

# ⚠ os que interessam
grep -iE 'open|handle|url|did|will|verif|check|auth|token' _sel.txt | head -20
```

```bash
# ── 3. ⚠ A PROTECAO, pelo nome ─────────────────────────────
strings -n 5 "$BIN" | grep -iE 'jailbreak|root|cydia|frida|substrate|'\
'debugger|integrity|tamper|ptrace|anti' | sort -u
#    ⚠ cada linha e' uma pista do modulo 9
```

```bash
# ── 4. SWIFT — o que esta mangled, e o que esta exposto ────
echo "══ simbolos Swift"
nm -a "$BIN" 2>/dev/null | grep -E '\$s' | wc -l

echo "══ desmanglados (amostra)"
nm -a "$BIN" 2>/dev/null | grep -oE '\$s[0-9A-Za-z_]+' | head -15 | while read s; do
  d=$(swift demangle --compact "$s" 2>/dev/null | tail -1)
  printf "%-50s -> %s\n" "$s" "$d"
done

echo "══ expostos ao runtime ObjC (@objc)"
otool -oV "$BIN" 2>/dev/null | grep -iE 'handle|open|didReceive|perform' | head
```

```bash
# ── 5. ⚠ O PONTO DE ENTRADA E OS HANDLERS ─────────────────
otool -oV "$BIN" 2>/dev/null | grep -B2 -A2 -iE 'AppDelegate|SceneDelegate' | head -30
strings -n 5 "$BIN" | grep -iE '://|scheme|openURL|userActivity' | head -15
```

```bash
# ── 6. ⚠ APP GROUP — quem compartilha ──────────────────────
codesign -d --entitlements - "$APP" 2>&1 | grep -iA2 'group'
strings -n 6 "$BIN" | grep -iE 'AppGroup|group\.' | head

# ── 7. A LISTA DE PONTOS DE ENTRADA ────────────────────────
cat > entradas.md <<'EOF'
# Pontos de entrada — <app>
| Metodo | Classe | Fonte do dado | ⚠ Verifica origem? |
|--------|--------|---------------|--------------------|
| openURL: |        | URL externa   |                    |
## ⚠ @objc expostos que recebem dado externo
## Protecoes identificadas (modulo 9)
EOF
```

**O que observar:** no passo 2, os seletores são **strings legíveis** — e a lista inteira sai em um comando. ⚠ É o que torna a análise de app Objective-C rápida: ⚠ **o app denuncia os próprios métodos**. ⚠ E no passo 4, a comparação entre `$s` mangled e os `@objc` expostos: ⚠ o que está exposto é a **superfície de entrada**, e é por ali que se instrumenta.

**Exercício 1:** complete o `entradas.md` com pelo menos **três** pontos de entrada. ⚠ A coluna "verifica origem" é a que o módulo 5 confirma — escreva **a sua previsão**.

**Exercício 2:** pegue **um** símbolo Swift mangled do passo 4 e desmangle-o à mão, seguindo a estrutura do 3.3. ⚠ Depois confirme com `swift demangle` e escreva o resultado.

**Exercício 3 (o que vale):** escolha **uma** classe que aparenta tratar segredo (`Keychain`, `Crypto`, `Token`) e localize **os métodos dela** nos metadados. ⚠ Escreva: quais métodos existem, e **qual seria o ponto de hook** para observá-los. É a preparação do módulo 8.

---

## Resumo

- ⚠ **Objective-C usa MENSAGEM, não chamada direta** — a resolução é em runtime, e é isso que permite instrumentar.
- ⚠ **Classe e método têm metadados no binário** — você **lista** e você **lê o nome**.
- ⚠ **Seletores são strings** — um `grep` por `algo:` acha qualquer método chamado.
- ⚠ **O nome da classe denuncia a proteção** — `RootDetection`, `JailbreakCheck` aparecem sem desmontagem.
- ⚠ **Swift mangla os nomes** — e `swift demangle` reverte.
- ⚠ **`@objc` reexpõe ao runtime** — e é onde mora a superfície de entrada de um app Swift.
- ⚠ **`openURL` recebe dado de QUALQUER app** — e `SourceApplicationKey` diz quem abriu, e quase nunca é lido.
- ⚠ **`App Group` compartilha dado por entitlement** — e o app mais fraco compromete o mais forte.
- ⚠ **Chamada direta (C, Swift estático) não passa pelo runtime** — aí o caminho é `Interceptor` no endereço.

---

## O que o próximo módulo entrega

Você sabe ler o runtime. O módulo 4 abre **o privilégio**: `code signing`, `entitlements` e assinatura — o que o app **pode fazer**, declarado e assinado.
