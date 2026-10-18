# Módulo 10 — Simulador × Dispositivo: O Que Muda

**Curso:** iOS Security Research: Internals e Engenharia Reversa
**Módulo:** 10 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 9
**Próximo:** Módulo 11 — Projeto final

---

## O que este módulo entrega

Ao final, você vai saber **o que o simulador falseia** — item por item — e **o que, por isso, só o dispositivo responde**. É o módulo que impede a conclusão errada: um achado obtido no simulador **não vale** no aparelho, e confundir os dois é o erro que o curso inteiro tenta evitar.

---

## 10.1 A tese, e por que este módulo existe

⚠ **A afirmação que organiza o módulo:**

> **O simulador não é um iOS pequeno. É um ambiente DIFERENTE, que imita a interface.**

⚠ **E a razão, dita sem rodeio:** ⚠ o simulador **roda no Mac**, com a **arquitetura do Mac**, e ⚠ **não tem o hardware de segurança do aparelho**. ⚠ Ele executa o app em `x86_64`/`arm64` do host, com as **frameworks reimplementadas** — não as do sistema real.

⚠ **A consequência prática, e ela atravessa o curso:**

| O que se faz no simulador | ⚠ O que isso **não** prova |
|---|---|
| Analisar o binário | ⚠ Que é o binário do **aparelho** |
| Ver o container | ⚠ Que a **Data Protection** funciona |
| Rodar com `lldb` | ⚠ Que o app aceita depuração **produção** |
| Testar URL scheme | ⚠ Que outro **app** consegue invocar |
| Ver o `Keychain` | ⚠ ⚠ **Que o `Keychain` é o real** |

⚠ **A última linha é a mais grave, e o módulo 5 já avisou:** ⚠ **o simulador não tem `Secure Enclave`**. ⚠ O `Keychain` dele é uma **imitação** — e conclusão sobre proteção de chave obtida ali **não vale**.

---

## 10.2 A tabela completa

⚠ **O inventário das diferenças, e cada linha é um item que o relatório precisa marcar:**

| Aspecto | ⚠ Simulador | ⚠ Dispositivo |
|---|---|---|
| **Arquitetura** | ⚠ `x86_64`/`arm64` **do Mac** | ⚠ **`arm64` do aparelho** |
| **Binário** | ⚠ **Outra fatia** do fat binary | ⚠ A fatia do aparelho |
| ⚠ **`Secure Enclave`** | ❌ **Não existe** | ✅ Real |
| ⚠ **`Keychain`** | ⚠ **Imitação** | ⚠ ⚠ **Real, com `SEP`** |
| ⚠ **`Data Protection`** | ⚠ ⚠ **Não implementada** | ✅ Real, por arquivo |
| **`Touch ID`/`Face ID`** | ❌ Simulado | ✅ Real |
| ⚠ **`PAC`** | ⚠ ⚠ **Ausente** | ✅ `arm64` real |
| **`Attestation`** | ❌ Não funciona | ✅ Real |
| ⚠ **`sandbox`** | ⚠ Mais **frouxo** | ⚠ ⚠ **O real** |
| **Rede** | ⚠ Pela rede **do Mac** | Pela rede do aparelho |
| ⚠ **`PT_DENY_ATTACH`** | ⚠ Comportamento **diferente** | ⚠ O real |
| **`jailbreak`** | ❌ Não existe | ✅ Possível |
| **Câmera / sensor** | ❌ Simulado | Real |
| ⚠ **Versão do iOS** | ⚠ Do **SDK do Xcode** | ⚠ A do aparelho |

⚠ **As linhas marcadas são as que o relatório precisa declarar** — e cada uma invalida uma conclusão específica.

---

## 10.3 O que cada diferença invalida

⚠ **A correspondência direta entre a diferença e a conclusão que ela impede:**

| Diferença | ⚠ Conclusão que **não** se pode tirar no simulador |
|---|---|
| ⚠ **Arquitetura diferente** | ⚠ "encontrei o defeito no código nativo" |
| ⚠ **`SEP` ausente** | ⚠ ⚠ "a chave está bem protegida" |
| ⚠ **`Data Protection` ausente** | ⚠ ⚠ "o arquivo está protegido com classe X" |
| ⚠ **`PAC` ausente** | ⚠ "o desvio de fluxo é possível/fácil" |
| ⚠ **`sandbox` frouxo** | ⚠ "o app **consegue** ler fora do container" |
| ⚠ **`attestation` ausente** | ⚠ "a proteção não funciona" |
| ⚠ **Versão do SDK** | ⚠ "o comportamento é este na versão X" |

⚠ **A quinta linha é a que mais produz conclusão errada, e vale explicar:** ⚠ no simulador, o `sandbox` é **consideravelmente mais permissivo** — porque o app roda no Mac, com o sistema de arquivos do Mac alcançável. ⚠ Uma leitura que "funciona" no simulador pode **falhar no aparelho** — e o contrário também: ⚠ o simulador **deixa passar** o que o aparelho **nega**.

⚠ **E a terceira é a que o módulo 5 já cobrou:** ⚠ as classes de `Data Protection` **não são implementadas** no simulador. ⚠ Você **vê a referência** no código e **não vê o efeito**. ⚠ Concluir sobre proteção de arquivo sem o aparelho é **afirmar sem medir**.

---

## 10.4 O que o simulador **serve** para fazer

⚠ **A parte que a maioria omite, e ela é grande — o simulador é útil:**

| ✅ Serve para | ⚠ Por quê |
|---|---|
| ⚠ **Análise estática** | O `IPA` **é** o mesmo pacote |
| ⚠ **`Info.plist` e `entitlements`** | ⚠ São **assinados** — não mudam |
| ⚠ **Metadados de ObjC** | Estão no binário |
| **Lógica e fluxo** | O código é o mesmo |
| ⚠ **Depuração com `lldb`** | ⚠ ⚠ **Funciona e é o caminho do Nível A** |
| **UI e comportamento do app** | É o mesmo app |
| ⚠ **Descoberta de classes** | O runtime é o mesmo |

⚠ **A primeira e a segunda linhas são as que fazem os módulos 2, 4 e 6 rodarem inteiramente no Nível A:** ⚠ o pacote, o `plist` e os `entitlements` **são assinados** — e portanto **idênticos** no aparelho. ⚠ O que o simulador não dá é **o efeito em runtime do hardware**.

⚠ **E a quinta é a que o módulo 8 já estabeleceu:** ⚠ o `lldb` é o instrumento do **Nível A** — e a depuração de **lógica** funciona. ⚠ O que **não** funciona é concluir sobre o que o **aparelho** faria.

⚠ **A regra prática, e ela é o que o curso quer deixar:**

```
   NO SIMULADOR, voce prova:    O QUE O CODIGO FAZ
   NO APARELHO, voce prova:     O QUE O SISTEMA PERMITE
```

⚠ **É a mesma distinção do módulo 6 do curso de Android:** ⚠ a estática dá **hipótese**; ⚠ a dinâmica **no ambiente certo** dá **conclusão**.

---

## 10.5 Subir para o dispositivo

⚠ **O caminho formal, sem `jailbreak`, e ele exige uma coisa só: ⚠ **um Apple ID**:

```
   1. ⚠ Apple ID (gratuito) no Xcode
   2. ⚠ perfil de desenvolvimento ASSINADO
   3. ⚠ aparelho registrado
   4. ⚠ app instalado com `get-task-allow`
        -> ⚠ DEPURAVEL, com lldb, SEM jailbreak
```

⚠ **A quarta linha é a chave, e ela conecta ao módulo 4:** ⚠ um app instalado com **perfil de desenvolvimento** tem `get-task-allow` — ⚠ e portanto **aceita `lldb`** sem aparelho comprometido. ⚠ É o Nível B **sem `jailbreak`** — e é o mais próximo do ambiente real que se consegue **sem comprometer nada**.

⚠ **O que isso **não** dá:** ⚠ instrumentar **app de terceiro**. ⚠ O perfil assina **o seu** app. ⚠ Para instrumentar outro, ⚠ o caminho é `jailbreak` — e as implicações estão no módulo 9.

```bash
# ── O fluxo, em comandos ──────────────────────────────────
# 1. ⚠ registre o aparelho (Xcode > Devices and Simulators)
xcrun devicectl list devices

# 2. ⚠ instale o SEU app, assinado com o SEU perfil
xcrun devicectl device install app --device <ID> MeuApp.app

# 3. ⚠ rode e observe
xcrun devicectl device process launch \
  --device <ID> --console com.exemplo.app

# 4. ⚠ e depure com lldb (o app tem get-task-allow)
PID=$(xcrun devicectl device info processes --device <ID> 2>/dev/null | \
      grep -i exemplo | awk '{print $1}')
lldb -p "$PID" 2>/dev/null
```

⚠ **A segunda linha é a que materializa o Nível B:** ⚠ o app é **seu**, assinado com **seu perfil** — e roda no **aparelho real**, com o **hardware real**. ⚠ É onde as conclusões dos módulos 5 e 9 passam a valer.

⚠ **E a limitação de tempo do perfil gratuito** é fato, e vai no relatório: ⚠ perfis de desenvolvimento expiram, e o app **deixa de rodar**. ⚠ Não muda a análise — muda a **reprodutibilidade** dela.

---

## 10.6 O relatório: a coluna de nível

⚠ **O formato, e ele é a razão de o módulo existir:**

```
ANALISE — <app>
──────────────────────────────────────────────────────────
NIVEL DA ANALISE:  A (simulador) | B (dispositivo) | B+jailbreak
Modelo:            <aparelho ou simulador> · iOS: <versao>
──────────────────────────────────────────────────────────
| # | Achado | ⚠ OBTIDO EM | ⚠ VALE NO APARELHO? |
|---|--------|-------------|----------------------|
| 1 | entitlement excessivo | A | ✅ ⚠ assinado — identico |
| 2 | token em .plist | A | ✅ contexto; ⚠ protecao so' em B |
| 3 | openURL sem verificar origem | A | ⚠ precisa B para confirmar |
| 4 | classe de Keychain fraca | ⚠ A (codigo) | ❌ ⚠ ⚠ SO' B responde |
| 5 | PT_DENY_ATTACH ativo | B | ✅ |
──────────────────────────────────────────────────────────
⚠ O QUE FICOU PENDENTE DE NIVEL B:
   - <lista>
──────────────────────────────────────────────────────────
```

⚠ **A coluna `VALE NO APARELHO?` é a que qualifica o achado** — e ela tem **três** respostas possíveis, não duas:

| Resposta | ⚠ Significado |
|---|---|
| ✅ **Sim** | ⚠ O achado é **de estrutura** — `entitlement`, `plist`, código |
| ⚠ **Precisa de B** | ⚠ O achado é **plausível**, e a confirmação exige hardware |
| ❌ ⚠ **Só B responde** | ⚠ ⚠ **Não se sabe** — e o relatório **declara** |

⚠ **A terceira é a mais importante, e é a mais honesta:** ⚠ achados de `Keychain` e de `Data Protection` **não têm** resposta no simulador. ⚠ Escrever *"não foi possível determinar sem dispositivo"* é **resultado** — não lacuna escondida.

⚠ **É a mesma estrutura do curso de LLM e do curso de Android:** ⚠ declarar a **limitação** fortalece o relatório. ⚠ O silêncio sobre o que não se mediu é o que o enfraquece.

---

## Laboratório 10 — Medir as diferenças

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Nível A obrigatório; Nível B onde houver aparelho.**

```bash
mkdir -p ~/ios-lab/m10 && cd ~/ios-lab/m10
APP=$(find ../m02/ipa/Payload -maxdepth 1 -name '*.app' | head -1)
BIN=$(find "$APP" -maxdepth 1 -type f -perm +111 | head -1)
```

```bash
# ── 1. ⚠ AS ARQUITETURAS — a diferenca numero um ───────────
echo "══ fatias do binario"
lipo -info "$BIN" 2>/dev/null || file "$BIN"

echo "══ o Mac"
uname -m
echo "══ o simulador booted usa:"
xcrun simctl spawn booted uname -m 2>/dev/null
#    ⚠ compare com a fatia do aparelho
```

```bash
# ── 2. ⚠ O QUE O SIMULADOR NAO TEM ────────────────────────
cat <<'EOF'
══ ausencias confirmadas no simulador:
  ✗ Secure Enclave      -> Keychain NAO e' o real
  ✗ Data Protection     -> classes NAO implementadas
  ✗ Touch ID / Face ID  -> simulados
  ✗ PAC (arm64 real)    -> ausente
  ✗ App Attest          -> nao funciona
  ✗ jailbreak           -> nao existe
EOF

# ⚠ teste direto: o simulador tem chave de hardware?
xcrun simctl spawn booted security list-keychains 2>/dev/null | head
#    ⚠ funciona? entao o Keychain e' uma IMITACAO no simulador
```

```bash
# ── 3. ⚠ O SANDBOX — mais frouxo no simulador ─────────────
#    ⚠ tente ler FORA do container (o app proprio, via lldb ou codigo)
CT=$(xcrun simctl get_app_container booted com.exemplo.app data 2>/dev/null)
ls "$CT/../" 2>/dev/null | head
#    ⚠ anote: o simulador DEIXA ver outros containers?
#    ⚠ no APARELHO, isso e' negado pelo sandbox real
```

```bash
# ── 4. ⚠ O QUE VALE MESMO NO SIMULADOR ───────────────────
echo "══ entitlements (⚠ ASSINADOS — identicos no aparelho)"
codesign -d --entitlements - "$APP" 2>&1 | head -15

echo "══ Info.plist (⚠ o mesmo)"
plutil -p "$APP/Info.plist" | head -10

echo "══ metadados objc (⚠ o mesmo codigo)"
otool -oV "$BIN" 2>/dev/null | grep -c 'name 0x'
#    ⚠ esses tres VALEM no aparelho
```

```bash
# ── 5. ⚠ NÍVEL B — o teste que muda a conclusao ───────────
cat <<'EOF'
No APARELHO, com o SEU app e o SEU perfil:

1. instale e rode:
     xcrun devicectl device install app --device <ID> MeuApp.app
     xcrun devicectl device process launch --device <ID> com.exemplo.app

2. ⚠ e responda as perguntas que o simulador NAO responde:
   - a classe de Data Protection do arquivo e' qual?
   - o item do Keychain tem ThisDeviceOnly?
   - o sandbox nega a leitura fora do container?
   - o PT_DENY_ATTACH bloqueia o lldb?
EOF
```

```bash
# ── 6. O RELATORIO ────────────────────────────────────────
cat > nivel.md <<'EOF'
# Analise — nivel e limites
Nivel: A | B · Modelo: · iOS:
| # | Achado | ⚠ OBTIDO EM | ⚠ VALE NO APARELHO? |
|---|--------|-------------|----------------------|
## ⚠ PENDENTE DE NIVEL B (nao respondido)
## ⚠ O QUE NAO SE PODE AFIRMAR com este nivel
EOF
```

**O que observar:** no passo 4, os **três** itens que o simulador dá e que **valem** no aparelho — porque são **assinados** ou **do binário**. ⚠ E no passo 2, a confirmação das ausências: ⚠ **toda** conclusão sobre `Keychain`, `Data Protection` e `PAC` feita no simulador está **pendente**.

**Exercício 1:** complete o `nivel.md` com **todos** os achados do seu trabalho até aqui, e a coluna `VALE NO APARELHO?` preenchida com as **três** respostas possíveis.

**Exercício 2:** pegue **um** achado marcado como "só B responde" e escreva **o que exatamente** o aparelho responderia — e **como** você mediria (código? jailbreak? Xcode?).

**Exercício 3 (o que vale):** escreva o parágrafo de **limitações de nível** do relatório, com pelo menos **quatro** itens. ⚠ Inclua explicitamente o que **não se pode afirmar** com o nível que você tem. É o que o módulo 11 vai exigir.

---

## Resumo

- ⚠ **O simulador não é um iOS pequeno** — é ambiente **diferente**, que imita a interface.
- ⚠ **Arquitetura diferente** significa **outra fatia** do binário — outro código de máquina.
- ⚠ ⚠ **Sem `SEP`, o `Keychain` é imitação** — conclusão sobre proteção de chave **não vale**.
- ⚠ ⚠ **`Data Protection` não é implementada** — você vê a referência, não o efeito.
- ⚠ **O `sandbox` é mais frouxo** — uma leitura que funciona lá pode **falhar** no aparelho.
- ⚠ **`PAC` e `attestation` ausentes** — conclusão sobre integridade fica **pendente**.
- ✅ **O simulador serve:** estática, `plist`, `entitlements`, metadados, lógica e **`lldb`**.
- ⚠ **O que é assinado é idêntico** — pacote, `plist` e `entitlements` **valem** nos dois.
- ⚠ **O Nível B sem `jailbreak` existe:** perfil de desenvolvimento, com `get-task-allow`.
- ⚠ **A coluna `VALE NO APARELHO?` tem três respostas** — e *"só B responde"* é **resultado**, não lacuna.

---

## O que o próximo módulo entrega

Você sabe o que cada nível prova. O módulo 11 fecha o curso: **a análise completa de um app**, com relatório que declara **em que nível cada achado foi obtido**.
