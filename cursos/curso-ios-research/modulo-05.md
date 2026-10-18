# Módulo 5 — `Sandbox`, `Container` e `Keychain`

**Curso:** iOS Security Research: Internals e Engenharia Reversa
**Módulo:** 5 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 4
**Próximo:** Módulo 6 — Análise estática de binário

---

## O que este módulo entrega

Ao final, você vai saber **mapear onde um app iOS guarda dado** e, para cada lugar, **quem consegue ler** — com a **classe de proteção** do arquivo e o que ela garante. Você vai entender por que o `Keychain` não é o `KeyStore` do Android, e vai saber a **superfície de entrada por URL** que este módulo também cobre.

---

## 5.1 O `sandbox`: o que ele é, e o que ele não é

⚠ **A diferença estrutural em relação ao Android, e vale escrever de início:**

```
   ANDROID                          iOS
   ───────                          ───

   ⚠ uid + SELinux                   ⚠ PERFIL de sandbox
     decide o acesso                   decide o acesso
     a ARQUIVO                         a OPERACAO

   ⚠ o app ve' /data/data/<pkg>       ⚠ o app ve' o PROPRIO container
                                        e alguns caminhos compartilhados

   ⚠ um app nao le' o outro           ⚠ um app nao le' o outro
     por falta de permissao             por nao estar no perfil
```

⚠ **A frase que organiza a seção:**

> **No iOS, o `sandbox` não é um `uid` — é um PERFIL que descreve quais operações o processo
> pode executar.**

⚠ **E a consequência para a análise é grande:** ⚠ o `sandbox` é aplicado **por operação** — abrir arquivo em tal caminho, falar com tal serviço, usar tal recurso. ⚠ Um app pode ter **acesso a `Câmera`** e **nenhum acesso a arquivo fora do container** — são decisões independentes.

⚠ **Os caminhos que o app alcança, e só eles:**

| Caminho | ⚠ Quem mais lê |
|---|---|
| ⚠ **Bundle** (`MeuApp.app/`) | ⚠ Somente leitura — assinado |
| ⚠ **`Data/Application/<UUID>/`** | ⚠ Só o app |
| ⚠ **`Shared/AppGroup/<UUID>/`** | ⚠ ⚠ **Os apps do MESMO grupo** |
| `/var/mobile/Media/DCIM` | ⚠ Com autorização do usuário |
| **`iCloud`** | ⚠ Os aparelhos do mesmo usuário |
| ⚠ **`Keychain`** | ⚠ ⚠ **Os apps do mesmo `access-group`** |

⚠ **A terceira e a última linhas são as que **quebram o isolamento** — e são por **`entitlement`** (módulo 4). ⚠ Não é uma falha; é o desenho. ⚠ Mas significa que: ⚠ **o app mais fraco do grupo alcança o dado do mais forte.**

---

## 5.2 O container, por dentro

⚠ **A estrutura é previsível, e cada pasta tem uma consequência:**

```
   Data/Application/<UUID>/
   ├── Documents/          ⚠ exposto ao USUARIO (se UIFileSharingEnabled)
   │                       ⚠ e vai para o BACKUP
   ├── Library/
   │     ├── Preferences/*.plist   ⚠ ⚠ CONFIGURACAO — e, as vezes, credencial
   │     ├── Caches/              ⚠ nao vai para backup
   │     ├── Application Support/  ⚠ bancos SQLite costumam ficar aqui
   │     └── Keychains/            ⚠ referencias — o dado esta no Keychain
   ├── tmp/                 ⚠ temporario, volátil
   └── .com.apple.mobile_container_manager.metadata.plist  ⚠ metadados
```

⚠ **As três pastas que rendem achado, e por razões diferentes:**

| Pasta | ⚠ O achado típico |
|---|---|
| ⚠ **`Library/Preferences/*.plist`** | ⚠ ⚠ **Token, flag de autorização, e-mail** |
| ⚠ **`Application Support/`** | ⚠ Banco `SQLite` com dado e, às vezes, credencial |
| ⚠ **`Documents/`** | ⚠ Dado **visível ao usuário** — e em **backup** |

⚠ **A segunda é a mais subestimada:** ⚠ `Application Support` é onde o `Core Data` e os bancos costumam ficar — e **não aparece na interface**. ⚠ É o análogo do `databases/` do curso de Android.

⚠ **E o `Documents/` merece a distinção que o relatório precisa fazer:** ⚠ ele é **visível ao usuário** quando `UIFileSharingEnabled` está ligado (módulo 2) — ⚠ mas isso **não é** o mesmo que "exposto a outros apps". ⚠ O `sandbox` continua valendo. ⚠ O que muda é: ⚠ **o usuário** alcança, e o **backup** leva.

```bash
# ⚠ No SIMULADOR (nivel A) — a estrutura existe
SIM=~/Library/Developer/CoreSimulator/Devices
CT=$(find "$SIM" -maxdepth 9 -type d -path '*Data/Application/*' 2>/dev/null | head -1)
echo "container: $CT"
find "$CT" -maxdepth 3 -type d 2>/dev/null | head -20

# ⚠ e o plist de preferencias
find "$CT" -name '*.plist' 2>/dev/null | head -5
plutil -p "$CT/Library/Preferences/"*.plist 2>/dev/null | head -20
```

⚠ **A última consulta é a que rende:** ⚠ `plutil -p` imprime o `.plist` **legível** — e é onde você encontra **flag de autorização** guardada no lado cliente. ⚠ É a **mesma classe** do achado do módulo 9 do curso de Android: ⚠ *o app decide com base em dado local* — e a pergunta é **se o servidor confirma**.

---

## 5.3 `Data Protection`: a proteção por arquivo

⚠ **O que **não** existe no Android, e é central aqui:**

```
   ⚠ CADA ARQUIVO TEM UMA CLASSE DE PROTEÇÃO
      que decide QUANDO ele pode ser lido:

   NSFileProtectionComplete          ⚠ so' com aparelho DESBLOQUEADO
   NSFileProtectionCompleteUnlessOpen  ⚠ ate' fechar o arquivo
   ⚠ NSFileProtectionCompleteUntilFirstUserAuthentication
                                        ⚠ apos o PRIMEIRO desbloqueio
   ⚠ NSFileProtectionNone              ⚠ ⚠ SEMPRE legivel
```

⚠ **A leitura de segurança, e ela é o que o relatório precisa dizer:**

| Classe | ⚠ Legível com aparelho bloqueado? | ⚠ Vai para backup? |
|---|---|---|
| **`Complete`** | ❌ Não | ⚠ Sim (cifrado) |
| **`CompleteUntilFirstUserAuthentication`** | ⚠ ⚠ **Sim, após o primeiro desbloqueio** | Sim |
| ⚠ **`None`** | ⚠ ⚠ **Sempre** | ⚠ Sim, em claro no backup |

⚠ **A segunda linha é a **classe padrão** de muitos apps, e é a que engana:** ⚠ `UntilFirstUserAuthentication` protege **até** o primeiro desbloqueio — e depois disso **o arquivo fica legível enquanto o aparelho estiver ligado**. ⚠ Não é "protegido" no sentido intuitivo.

⚠ **A terceira é o achado direto:** ⚠ `NSFileProtectionNone` significa **nenhuma proteção** — e o arquivo é lido **mesmo com aparelho bloqueado**.

⚠ **E a coluna do backup é a que liga ao 5.4:** ⚠ a `Data Protection` protege **o arquivo no aparelho**; ⚠ o **backup** é outra questão — e é o achado de maior alcance, como no Android.

```bash
# ⚠ A classe de protecao — no APARELHO (nivel B)
#    device: via codigo, o atributo NSFileProtectionKey do arquivo:
#    NSDictionary *a = [fm attributesOfItemAtPath:p error:nil];
#    a[NSFileProtectionKey]
#
# ⚠ e a versao de linha de comando, no aparelho com jailbreak:
#    find /var/mobile/Containers/Data/Application -name '*.plist' \
#      -exec ls -l@ {} \; | grep -i protection
```

⚠ **A consulta acima exige o **Nível B** — e é a primeira do curso que **explicitamente não funciona no simulador**. ⚠ O simulador **não implementa** as classes de proteção reais. ⚠ É o módulo 10.

---

## 5.4 `Keychain`: o que ele é, de verdade

⚠ **A confusão mais comum, e a diferença em relação ao Android:**

| | Android `KeyStore` | ⚠ iOS `Keychain` |
|---|---|---|
| O que guarda | ⚠ Chave | ⚠ ⚠ **Dado arbitrário** |
| Acesso | Por app | ⚠ **Por `access-group`** |
| Proteção | Hardware | ⚠ **Classe de acessibilidade** |
| ⚠ Compartilhamento | Não | ⚠ ⚠ **Sim — por entitlement** |
| Backup | — | ⚠ **Pode ir para o backup** |

⚠ **A primeira linha é a que mais confunde quem vem do Android:** ⚠ o `Keychain` do iOS **não é um cofre de chaves** — é um **armazenamento de itens**, que guarda **senha, token, certificado, chave**. ⚠ Tratá-lo como "cofre" leva a conclusão errada.

⚠ **A quarta é a específica do iOS:** ⚠ o `access-group` decide **quais apps leem aquele item** — e ele vem do **`entitlement`** (módulo 4). ⚠ Um item gravado sem grupo explícito fica no grupo **do próprio app** — mas o app **pode escolher** outro, **se o entitlement permitir**.

```objectivec
// ⚠ Gravacao SEM declarar o grupo — o item fica no grupo implicito
NSDictionary *item = @{
    (__bridge id)kSecClass:       (__bridge id)kSecClassGenericPassword,
    (__bridge id)kSecAttrAccount: @"token",
    (__bridge id)kSecValueData:   [token dataUsingEncoding:NSUTF8StringEncoding],
    (__bridge id)kSecAttrAccessible: (__bridge id)kSecAttrAccessibleWhenUnlocked,
    // ⚠ NAO declara kSecAttrAccessGroup -> grupo do app
};

// ⚠ E a classe de acessibilidade — a que decide QUANDO se le'
//    kSecAttrAccessibleWhenUnlocked            ⚠ so' desbloqueado
//    kSecAttrAccessibleAfterFirstUnlock        ⚠ apos o 1o desbloqueio
//    kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly  ⚠ o mais forte
//    ⚠ kSecAttrAccessibleAlways                ⚠ ⚠ SEMPRE legivel
//    ⚠ ThisDeviceOnly -> NAO vai para backup
```

⚠ **As duas informações que o relatório precisa ter:** ⚠ **a classe de acessibilidade** e **se é `ThisDeviceOnly`**. ⚠

| `ThisDeviceOnly`? | ⚠ Consequência |
|---|---|
| ⚠ **Não** | ⚠ ⚠ **O item vai no backup** — e pode ser restaurado em outro aparelho |
| **Sim** | ⚠ Não vai — ⚠ e não é recuperável de backup |

⚠ **A primeira linha é o achado de maior alcance:** ⚠ um token sem `ThisDeviceOnly` **sai do aparelho no backup** — e é o mesmo resultado do `allowBackup` no Android, com outro mecanismo.

⚠ **E a classe do primeiro bloco merece a coerência:** ⚠ `kSecAttrAccessibleAlways` está **deprecada** e é o pior caso — item legível **sempre**. ⚠ Aparece em código antigo, e é achado.

```bash
# ⚠ No binario: quais classes de acessibilidade o app usa
strings -n 6 "$BIN" | grep -E 'Accessible|ThisDeviceOnly' | sort -u
#    ⚠ cada string e' uma classe que o app pode estar gravando

# ⚠ e os itens, no APARELHO (nivel B, com jailbreak):
#    ⚠ a tabela do Keychain e' um SQLite protegido
#    /var/Keychains/keychain-2.db  (⚠ formatado, nao SQLite comum)
```

⚠ **A segunda consulta exige `jailbreak`** — e note o comentário: ⚠ o `Keychain` **não é um SQLite comum**. ⚠ Ele é gerenciado pelo `securityd`, com o próprio formato. ⚠ Ler o dado **não é extrair um arquivo** — é **usar a API**, no contexto de um app com o `access-group` certo.

---

## 5.5 A superfície de entrada por URL

⚠ **Este módulo também cobre a entrada, porque ela **é** o caminho do dado:**

```
   QUALQUER APP                SEU APP
   ───────────                 ───────

   open("meuapp://perfil?id=42")
        │
        ▼
   ⚠ handleOpenURL / openURL:options:
        │
        ├─ ⚠ 1. VERIFICA a origem?      (SourceApplicationKey)
        ├─ ⚠ 2. VALIDA o parametro?
        └─ ⚠ 3. Verifica AUTORIZACAO?
```

⚠ **As três perguntas são as mesmas do módulo 3, e aqui elas têm nome:** ⚠

| # | Pergunta | ⚠ Se a resposta for ruim |
|---|---|---|
| 1 | Verifica a **origem**? | ⚠ ⚠ Qualquer app invoca |
| 2 | Valida o **parâmetro**? | ⚠ Dado arbitrário entra |
| 3 | Verifica **autorização**? | ⚠ Ação em nome do usuário |

⚠ **A primeira é a que quase nunca existe, e é o equivalente do `Binder.getCallingUid()`:** ⚠ `UIApplicationOpenURLOptionsSourceApplicationKey` **diz qual app abriu** — e a maioria do código **ignora**.

⚠ **A terceira é a que o Curso 3 investiga a fundo:** ⚠ um `deep link` que abre `meuapp://perfil?id=42` **sem checar se aquele perfil é do usuário** é **`IDOR` por URL scheme**. ⚠ É a mesma classe do módulo 4 do curso de Web Apps.

⚠ **E a validação de parâmetro tem armadilha própria aqui:** ⚠ a URL é **percent-encoded**, e a decodificação acontece **onde**? ⚠ Um app que valida **antes** de decodificar é vulnerável a **`%2e%2e%2f`** — exatamente o módulo 5 do curso de Web Apps (path traversal), na entrada de URL scheme.

```bash
# ⚠ O que o app aceita, pelo binario
strings -n 5 "$BIN" | grep -iE '^[a-z][a-z0-9+.-]*$' | head -20
strings -n 5 "$BIN" | grep -iE '://|scheme|openURL|handle' | head -15

# ⚠ e o Info.plist confirma quais schemes ESTAO REGISTRADOS
plutil -extract CFBundleURLTypes xml1 -o - "$APP/Info.plist"
```

⚠ **A comparação entre as duas consultas é achado:** ⚠ um scheme que o **código** menciona mas **não está** no `Info.plist` pode ser **tratado internamente**; ⚠ um que **está registrado** e **não aparece no código** é superfície **não compreendida**.

---

## 5.6 O mapa de armazenamento

⚠ **O instrumento do módulo, e ele tem a coluna que decide a gravidade:**

```
MAPA DE ARMAZENAMENTO — <app>
──────────────────────────────────────────────────────────
| # | Caminho | Conteudo | ⚠ Quem le | ⚠ PROTECAO | ⚠ Nivel |
|---|---------|----------|-----------|-----------|---------|
| 1 | Library/Preferences/x.plist | token | app | ? | A |
| 2 | Application Support/db.sqlite | pedidos | app | ? | A |
| 3 | Documents/relatorio.pdf | dado | ⚠ usuario + backup | ? | A |
| 4 | Keychain (grupo do app) | credencial | app | ⚠ classe? | ⚠ B |
| 5 | AppGroup compartilhado | ? | ⚠ outro app | ? | ⚠ B |
──────────────────────────────────────────────────────────
⚠ PROTECAO: classe de Data Protection, ou acessibilidade do Keychain
⚠ NIVEL: A (simulador) ou B (dispositivo) — o que foi possivel
```

⚠ **A coluna `PROTECAO` é a que só este curso tem** — e ela é o análogo da coluna *"como li"* do curso de Android: ⚠ ela **qualifica** o achado. ⚠ Um token em `.plist` com `NSFileProtectionNone` é grave; ⚠ o mesmo token com `Complete` e `ThisDeviceOnly` no `Keychain` **não é o mesmo achado**.

⚠ **E a coluna `NIVEL` é obrigatória desde o módulo 1:** ⚠ o que foi obtido no simulador **não vale** para o aparelho — e o módulo 10 explica **por quê**, item por item.

---

## Laboratório 5 — Mapear o armazenamento

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Nível A (simulador) para o mapa; Nível B para as colunas de proteção.**

```bash
mkdir -p ~/ios-lab/m05 && cd ~/ios-lab/m05
```

```bash
# ── 1. O CONTAINER, no simulador (nivel A) ─────────────────
#    ⚠ rode o app do laboratorio UMA vez no simulador para criar o container
xcrun simctl list devices booted
xcrun simctl get_app_container booted com.exemplo.app data 2>/dev/null
#    ⚠ se falhar: rode o app primeiro, ou use o caminho manual

CT=$(xcrun simctl get_app_container booted com.exemplo.app data 2>/dev/null)
[ -z "$CT" ] && CT=$(find ~/Library/Developer/CoreSimulator/Devices \
     -maxdepth 9 -type d -path '*Data/Application/*' 2>/dev/null | head -1)
echo "container: $CT"
find "$CT" -maxdepth 3 -type d 2>/dev/null | head -25
```

```bash
# ── 2. ⚠ O PLANO DE FUNDO — onde o dado costuma estar ─────
echo "══ 📁 📁 PREFERENCIAS"
find "$CT/Library/Preferences" -name '*.plist' 2>/dev/null
for f in "$CT/Library/Preferences/"*.plist; do
  [ -f "$f" ] && { echo "── $f"; plutil -p "$f" | head -20; }
done

echo "══ 📁 Application Support"
find "$CT/Library/Application Support" -type f 2>/dev/null | head -10

echo "══ 📁Documents"
find "$CT/Documents" -type f 2>/dev/null | head -10

echo "══ 📁 Caches e tmp"
find "$CT/Library/Caches" "$CT/tmp" -type f 2>/dev/null | head -5
```

```bash
# ── 3. ⚠ BANCOS e PREFERENCIAS — o conteudo ───────────────
for db in $(find "$CT" -name '*.sqlite' -o -name '*.db' 2>/dev/null); do
  echo "── $db"
  sqlite3 "$db" ".tables" 2>/dev/null
  sqlite3 "$db" ".schema" 2>/dev/null | head -10
done

# ⚠ e as strings sensiveis em qualquer arquivo
grep -rilE 'token|senha|password|secret|api[_-]?key' "$CT" 2>/dev/null | head
```

```bash
# ── 4. ⚠ A PROTECAO — nivel B (aparelho) ──────────────────
#    ⚠ no simulador NAO funciona: as classes nao sao implementadas
echo "══ no simulador:"
xattr -l "$CT/Documents" 2>/dev/null | head

echo "══ no aparelho (requer codigo ou jailbreak):"
cat <<'EOF'
Em codigo, no app:
  NSDictionary *a = [fm attributesOfItemAtPath:p error:nil];
  NSString *classe = a[NSFileProtectionKey];
  // ⚠ NSFileProtectionComplete | ...UntilFirstUserAuthentication
  //   | ...None

Com jailbreak:
  find /var/mobile/Containers/Data/Application -name '*.plist' \
    -exec sh -c 'ls -l@ "$1" | grep -i protection' _ {} \;
EOF
```

```bash
# ── 5. ⚠ O KEYCHAIN — as classes usadas ──────────────────
BIN=$(find ../m02/ipa/Payload -maxdepth 2 -type f -perm +111 | head -1)
strings -n 6 "$BIN" | grep -E 'Accessible|ThisDeviceOnly' | sort -u
#    ⚠ cada string e' uma classe de acessibilidade que o app usa

# ⚠ e o access-group
codesign -d --entitlements - "$(dirname "$BIN")" 2>&1 | grep -A4 'keychain'
```

```bash
# ── 6. ⚠ A SUPERFICIE DE URL ─────────────────────────────
APP=$(dirname "$BIN")
plutil -extract CFBundleURLTypes xml1 -o - "$APP/Info.plist" 2>/dev/null
strings -n 5 "$BIN" | grep -iE 'openURL|handleOpen|://' | head -10
```

```bash
# ── 7. O MAPA ─────────────────────────────────────────────
cat > mapa.md <<'EOF'
# Mapa de armazenamento — <app>
| # | Caminho | Conteudo | Quem le | ⚠ PROTECAO | ⚠ Nivel |
|---|---------|----------|---------|-----------|---------|
## ⚠ O que vai para BACKUP
## ⚠ O que sai do aparelho
## Superficie de URL — origem e parametro sao verificados?
EOF
```

**O que observar:** no passo 2, o **`.plist` de preferências** é o primeiro lugar a olhar — e `plutil -p` imprime legível. ⚠ E no passo 5, as **strings de acessibilidade**: ⚠ elas dizem **quais classes o app usa**, e `kSecAttrAccessibleAlways` ou a ausência de `ThisDeviceOnly` são achado direto.

**Exercício 1:** complete o `mapa.md` com todas as entradas encontradas, e a coluna `NIVEL` em cada linha. ⚠ Marque o que **só o Nível B** responde.

**Exercício 2:** no passo 3, liste **todo** dado sensível encontrado e classifique: **credencial**, **dado pessoal**, ou **flag de autorização**. ⚠ Para a flag, escreva **o que o app faz com ela** e **se o servidor confirma**.

**Exercício 3 (o que vale):** faça o teste do 5.5 — escreva **o que o app faz** com um parâmetro de URL scheme (pelo código), e **se valida origem, parâmetro e autorização**. ⚠ Se não houver validação, escreva o **caminho completo** de outro app até o efeito. É a preparação do Curso 3.

---

## Resumo

- ⚠ **O `sandbox` do iOS é por PERFIL, não por `uid`** — decide **operação**, não arquivo.
- ⚠ **Duas coisas quebram o isolamento, por `entitlement`:** `AppGroup` e **`keychain-access-group`**.
- ⚠ **`Library/Preferences/*.plist`** é onde flag de autorização e token costumam aparecer — e é legível com `plutil`.
- ⚠ **`Data Protection` é por arquivo** — e `UntilFirstUserAuthentication` é **o padrão que engana**.
- ⚠ **`NSFileProtectionNone` é legível sempre** — e vai ao backup.
- ⚠ **O `Keychain` não é cofre de chave** — é armazenamento de item, com **classe de acessibilidade**.
- ⚠ **Sem `ThisDeviceOnly`, o item sai no backup** — é o mesmo resultado do `allowBackup`, outro mecanismo.
- ⚠ **A superfície de URL tem três perguntas:** origem, parâmetro e **autorização** — e a primeira quase nunca é feita.
- ⚠ **A coluna `NÍVEL` é obrigatória** — o simulador **não implementa** as classes de proteção reais.

---

## O que o próximo módulo entrega

Você sabe onde o dado mora. O módulo 6 ensina a **ler o binário**: análise estática de `Mach-O`, símbolos, desmontagem e reconstrução de lógica.
