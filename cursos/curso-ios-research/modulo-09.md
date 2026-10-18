# Módulo 9 — Integridade, `Jailbreak` e Proteções

**Curso:** iOS Security Research: Internals e Engenharia Reversa
**Módulo:** 9 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 8
**Próximo:** Módulo 10 — Simulador × dispositivo

---

## O que este módulo entrega

Ao final, você vai saber **reconhecer** as proteções de um app iOS, **dizer o que cada uma tenta impedir**, e avaliar **o que ela consegue de fato**. O módulo também resolve o obstáculo do módulo 2 — o **binário cifrado** — porque é aqui que se aprende a **decifrá-lo** em ambiente próprio.

---

## 9.1 A tese, e a diferença em relação ao Android

⚠ **A afirmação que organiza o módulo:**

> **Nenhuma proteção impede a análise. Todas encarecem — e o iOS tem UMA coisa que
> o Android não tem: a verificação FORA do aparelho.**

⚠ **A tabela que resume, e ela é o que dá a este módulo um final diferente do de Android:**

| Proteção | ⚠ Onde ela vive | ⚠ Impede? |
|---|---|---|
| Detecção de `jailbreak` | ⚠ No app | ⚠ Não — contorna-se |
| Verificação de assinatura | ⚠ No app | ⚠ Não — patcha-se |
| Verificação de integridade | ⚠ No app | ⚠ Não — patcha-se |
| Antidepuração | ⚠ No app | ⚠ Não — contorna-se |
| Ofuscação | ⚠ No app | ⚠ Não — encarece |
| ⚠ ⚠ **`Attestation`** | ⚠ ⚠ **No SERVIDOR** | ⚠ ⚠ **SIM — o servidor recusa** |

⚠ **A última linha é a diferença estrutural deste curso em relação ao de Android:** ⚠ lá, a conclusão era *"o abuso se impede no servidor"* — e aqui existe um **mecanismo formal** para isso. ⚠ **`Attestation`** permite ao servidor **verificar** que a requisição veio de um app íntegro, em aparelho íntegro. ⚠ É o único caso em que a proteção **impede** — e ela **não está no app**.

⚠ **E a razão de isso não encerrar o assunto:** ⚠ `attestation` exige **hardware** e **serviço do provedor**, tem custo, e **não é universal**. ⚠ Onde ela não está, valem as linhas de cima — e é aí que o curso trabalha.

---

## 9.2 Detecção de `jailbreak`

⚠ **O padrão que você vai encontrar, e o nome das classes já o denuncia (módulo 3):**

```objectivec
// ⚠ As seis checagens classicas — todas LOCAIS
- (BOOL)isJailbroken {
    // 1. arquivos conhecidos
    NSArray *paths = @[@"/Applications/Cydia.app",
                       @"/Library/MobileSubstrate/MobileSubstrate.dylib",
                       @"/bin/bash", @"/usr/sbin/sshd", @"/etc/apt"];
    for (NSString *p in paths)
        if ([[NSFileManager defaultManager] fileExistsAtPath:p]) return YES;

    // 2. ⚠ escrever FORA do container
    NSError *e;
    [@"teste" writeToFile:@"/private/jb.txt" atomically:YES
                 encoding:NSUTF8StringEncoding error:&e];
    if (!e) return YES;

    // 3. ⚠ abrir URL de app de jailbreak
    if ([[UIApplication sharedApplication]
          canOpenURL:[NSURL URLWithString:@"cydia://package/com.example"]])
        return YES;

    // 4. fork — proibido no sandbox
    if (fork() != -1) return YES;

    // 5. ⚠ variaveis de ambiente
    if (getenv("DYLD_INSERT_LIBRARIES")) return YES;

    // 6. ⚠ symlink de /bin/sh
    struct stat s;
    if (lstat("/bin/sh", &s) == 0 && (s.st_mode & S_IFLNK)) return YES;

    return NO;
}
```

⚠ **O que cada checagem revela, e como cada uma se contorna:**

| Checagem | ⚠ Contorno | ⚠ Custo que ela impõe |
|---|---|---|
| Arquivo existe | ⚠ Hook em `fileExistsAtPath:` | Baixo |
| Escrita fora do container | ⚠ Hook em `writeToFile:` | Baixo |
| `canOpenURL` | ⚠ Hook em `canOpenURL:` | Baixo |
| `fork` | ⚠ Hook em `fork` | Baixo |
| **`DYLD_INSERT_LIBRARIES`** | ⚠ Rodar sem essa var | ⚠ Médio |
| **`lstat` de symlink** | ⚠ Hook em `lstat` | ⚠ Médio |

⚠ **A leitura de segurança é a mesma do curso de Android:** ⚠ **toda checagem é local, e portanto observável**. ⚠ O `grep` do módulo 3 achou `jailbreak`, `cydia` e `substrate` — e o módulo 8 já mostrou **como contornar**.

⚠ **E a contrapartida honesta, que o relatório precisa dizer:** ⚠ o contorno **pode quebrar o app legítimo**. ⚠ Um `fileExistsAtPath:` que devolve `NO` para `/bin/bash` afeta **qualquer** verificação de arquivo. ⚠ O contorno precisa ser **cirúrgico** — e **refeito a cada versão**.

---

## 9.3 Verificação de assinatura e integridade

⚠ **A família que **realmente** impede — até ser patchada:**

```objectivec
// ⚠ Verificacao da assinatura em runtime
- (BOOL)assinaturaOK {
    // 1. o TeamIdentifier esperado — ⚠ NO APP
    NSData *req = [self designatedRequirement];
    NSString *esperado = @"anchor apple generic and "
                         @"certificate leaf[subject.OU] = \"TEAMID123\"";

    // 2. ⚠ comparar com o que o sistema diz
    SecRequirementRef r;
    SecRequirementCreateWithString((__bridge CFStringRef)esperado,
                                   kSecCSDefaultFlags, &r);
    OSStatus st = SecStaticCodeCheckValidity((SecStaticCodeRef)code,
                                             kSecCSDefaultFlags, r);
    return (st == errSecSuccess);
}
```

⚠ **A estrutura do problema, e ela é sempre a mesma — igual à do curso de Android:**

```
   ⚠ O VALOR ESPERADO ESTA NO APP.

      significa que:
        1. ele e' LEGIVEL (strings / metadados)   -> modulo 6
        2. a COMPARACAO e' observavel             -> modulo 8
        3. e o RESULTADO e' alteravel             -> ⚠ forcar o retorno

   ⚠ Logo: a verificacao nao e' barreira —
        e' uma LINHA que se altera.
```

⚠ **E a variante que **muda o jogo** é a que roda **fora do app:**

⚠ **`App Attest`** (iOS 14+) — o app solicita ao `Secure Enclave` uma **chave atestada**, e o **servidor** verifica. ⚠ Aqui você **não** patcha uma comparação local: ⚠ a chave nasce no `SEP`, e o **servidor** valida a **atestação** — que cobre a **integridade do app** e do **aparelho**.

```objectivec
// ⚠ App Attest — a verificacao que NAO se contorna no app
DCAppAttestService *svc = [DCAppAttestService sharedService];
[svc generateKeyWithCompletionHandler:^(NSString *keyId, NSError *e) {
    // ⚠ keyId: a chave esta no SEP, e nao' sai de la'
    [svc attestKey:keyId clientDataHash:hash
        completionHandler:^(NSData *attestation, NSError *e2) {
        // ⚠ `attestation` vai para o SERVIDOR — e' ele que decide
    }];
}];
```

⚠ **O que isso muda, e o relatório precisa dizer:** ⚠ com `App Attest`, o atacante **não** altera uma linha para passar. ⚠ Ele precisa **de um aparelho não comprometido** — e, se comprometido, ⚠ **o `SEP` não assina**. ⚠ É o único caso em que a proteção **é estrutural** neste curso.

⚠ **E onde ele **não** resolve:** ⚠ exige servidor compatível, custo e disponibilidade; ⚠ e **não impede a análise** — impede o **uso** da aplicação por um cliente modificado. ⚠ A análise (módulos 6 a 8) **continua possível**.

---

## 9.4 Antidepuração e detecção de instrumentação

⚠ **A família que interage diretamente com o módulo 8:**

```objectivec
// ⚠ As quatro checagens de depuracao
// 1. sysctl — o processo esta sendo depurado?
int mib[4] = {CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()};
struct kinfo_proc info; size_t sz = sizeof(info);
sysctl(mib, 4, &info, &sz, NULL, 0);
if (info.kp_proc.p_flag & P_TRACED) return YES;     // ⚠ depurado

// 2. ptrace — recusar ser depurado
ptrace(PT_DENY_ATTACH, 0, 0, 0);                    // ⚠ bloqueia anexo

// 3. ⚠ dyld — dylib injetada?
if (getenv("DYLD_INSERT_LIBRARIES")) return YES;
for (uint32_t i = 0; i < _dyld_image_count(); i++) {
    const char *n = _dyld_get_image_name(i);
    if (strstr(n, "Frida") || strstr(n, "Substrate")) return YES;  // ⚠
}

// 4. ⚠ portas / threads conhecidas de ferramenta de hook
//    (cada ferramenta deixa rastro proprio)
```

⚠ **O que cada uma faz, e o que ela consegue:**

| Checagem | ⚠ Impede | ⚠ Consegue |
|---|---|---|
| `P_TRACED` | Ser depurado | ⚠ Atraso — o flag se forja |
| ⚠ **`PT_DENY_ATTACH`** | ⚠ ⚠ **Anexo por `ptrace`** | ⚠ ⚠ **Impede o `lldb`** — até ser neutralizado |
| `DYLD_INSERT_LIBRARIES` | Injeção por variável | ⚠ Atraso |
| Lista de imagens `dyld` | `Frida`/`Substrate` carregados | ⚠ Atraso — renomeia-se |

⚠ **A segunda é a única que **impede de fato**, e ela merece a explicação:** ⚠ `PT_DENY_ATTACH` faz o processo **recusar** o `ptrace` — e ⚠ **sem `ptrace` não há `lldb`**. ⚠ O contorno existe (chamar antes, ou neutralizar a chamada), e ⚠ ele **custa** — e é isso que a tabela do 9.1 resume.

⚠ **E a quarta é a que o `Frida` enfrenta:** ⚠ ele deixa rastro — nome de imagem, porta, `frida-server` na lista de processos. ⚠ Cada versão do `Frida` muda o rastro, e cada app pode procurá-lo de um jeito. ⚠ É uma corrida **assimétrica**: ⚠ o app paga uma vez, e quem analisa paga **a cada versão**.

---

## 9.5 Decifrar: resolvendo o obstáculo do módulo 2

⚠ **A resposta ao `cryptid = 1`, e ela exige **Nível B** ou um dump:**

```
   BINARIO DA LOJA: __TEXT cifrado no disco
        │
        ├─ ⚠ o kernel DECIFRA em memoria, ao carregar
        │    (a chave e' do aparelho, por app)
        │
        ▼
   ⚠ CAPTURAR o __TEXT ja' decifrado, EM EXECUCAO
        │
        ├─ (a) dump de memoria do processo, no aparelho
        ├─ (b) ⚠ ferramenta de decryption (⚠ exige jailbreak)
        └─ (c) ⚠ reescrever o binario com o conteudo decifrado
        ▼
   ⚠ AGORA: analise estatica normal (modulo 6)
```

⚠ **A delimitação do curso, escrita com clareza:** ⚠ este é o único ponto em que o material **descreve o procedimento e não o executa** contra alvo de terceiro. ⚠ A razão é a do curso inteiro: ⚠ **o alvo é o app do laboratório**, escrito pelo aluno. ⚠ Para app próprio, **não há cifra** — `cryptid = 0` e a análise é direta.

⚠ **O que **é** ensinado e exercitado:** ⚠ reconhecer o `cryptid`, entender **por que** o kernel decifra em memória, e **o que** o dump contém. ⚠ E o exercício do lab faz isso **no app próprio**, para demonstrar o mecanismo — e não para contornar proteção alheia.

⚠ **E a razão de isso ser reconhecimento, e não exploração:** ⚠ decifrar um app da loja é **ato sobre software de terceiro**, e é outra categoria de trabalho. ⚠ O curso entrega **o entendimento do mecanismo** — que é o que permite avaliar **a proteção do seu próprio app**.

---

## 9.6 O que a proteção entrega, de fato

⚠ **A tabela honesta, e ela é o produto do módulo:**

| Objetivo do autor | ⚠ O que a proteção consegue |
|---|---|
| Impedir a leitura do binário | ⚠ ⚠ **Nada, para app próprio** |
| Impedir a análise de app da loja | ⚠ Atraso — exige decifrar |
| Impedir a depuração | ⚠ ⚠ **Impede (`PT_DENY_ATTACH`)** — até neutralizar |
| Impedir a instrumentação | ⚠ Atraso — a corrida do rastro |
| Impedir a modificação | ⚠ Atraso — até o patch |
| Impedir a cópia do dado | ⚠ Parcial — `ThisDeviceOnly` ajuda |
| ⚠ ⚠ **Impedir o uso por cliente modificado** | ⚠ ⚠ **Só com `attestation`** |
| ⚠ **Dificultar o trabalho em escala** | ✅ **Isso ela consegue** |

⚠ **A terceira linha é a única da coluna do meio que diz "impede"** — e é a que interage com o módulo 8. ⚠ `PT_DENY_ATTACH` **bloqueia o `lldb`** de verdade. ⚠ O contorno existe, e é **outro caminho** — não um patch de linha.

⚠ **E a sétima é a conclusão do curso, e ela difere do curso de Android:** ⚠ lá, dizia-se *"o abuso se impede no servidor"* — e aqui existe **um mecanismo formal** para isso. ⚠ `Attestation` é a **única** proteção estrutural, e ela **não está no app**.

⚠ **A frase para o relatório:** ⚠ *"o app tem detecção de jailbreak, antidepuração e verificação de assinatura"* — ⚠ **e isso significa que o autor encareceu a análise**. ⚠ Significa que ele **impediu**? ⚠ Só se houver **atestação** — e é isso que o relatório precisa dizer, com essas palavras.

---

## Laboratório 9 — Mapear e avaliar

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Nível B (jailbreak) para contornar. O reconhecimento roda em qualquer nível.**

```bash
mkdir -p ~/ios-lab/m09 && cd ~/ios-lab/m09
APP=$(find ../m02/ipa/Payload -maxdepth 1 -name '*.app' | head -1)
BIN=$(find "$APP" -maxdepth 1 -type f -perm +111 | head -1)
```

```bash
# ── 1. O INVENTARIO — estatico (⚠ qualquer nivel) ─────────
echo "══ deteccao de jailbreak"
strings -n 5 "$BIN" | grep -iE 'cydia|jailbreak|substrate|/bin/bash|'\
'/usr/sbin/sshd|/etc/apt|MobileSubstrate' | sort -u

echo "══ antidepuração"
strings -n 5 "$BIN" | grep -iE 'ptrace|PT_DENY_ATTACH|P_TRACED|sysctl|'\
'DYLD_INSERT|isDebuggerAttached' | sort -u

echo "══ deteccao de instrumentacao"
strings -n 5 "$BIN" | grep -iE 'frida|substrate|cycript|objection|'\
'gadget|27042' | sort -u

echo "══ verificacao de assinatura / integridade"
strings -n 6 "$BIN" | grep -iE 'SecCode|SecRequirement|SecStaticCode|'\
'codeSign|designatedRequirement|TeamID' | sort -u

echo "══ ⚠ App Attest (a protecao ESTRUTURAL)"
strings -n 6 "$BIN" | grep -iE 'DCAppAttest|attestKey|generateKey|'\
'DeviceCheck|attestation' | sort -u
```

```bash
# ── 2. AS CLASSES QUE DENUNCIAM ───────────────────────────
otool -oV "$BIN" 2>/dev/null | grep -iE 'Jailbreak|Root|Integrity|'\
'Tamper|AntiDebug|Security|Guard' | head -20
```

```bash
# ── 3. ⚠ CIFRA — e o que isso implica ────────────────────
otool -l "$BIN" | grep -A4 LC_ENCRYPTION_INFO
#    ⚠ cryptid = 1 -> app da loja: precisa decifrar (nivel B)
#    ⚠ cryptid = 0 -> app proprio: analise direta
```

```bash
# ── 4. ⚠ NÍVEL B — o comportamento das protecoes ──────────
#    ⚠ rode o app no aparelho com jailbreak e observe
#    ⚠ a ferramenta ajuda: `objection` lista os checks
objection -g com.exemplo.app explore <<'OBJ' 2>/dev/null || \
  echo "(⚠ objection exige jailbreak)"
ios jailbreak simulate
ios jailbreak disable
exit
OBJ
#    ⚠ `simulate` faz o app ACHAR que ha jailbreak
#    ⚠ e `disable` desliga a deteccao — ⚠ registre que contornou
```

```bash
# ── 5. ⚠ O TESTE DO PT_DENY_ATTACH ───────────────────────
#    ⚠ o app bloqueia o lldb?
PID=$(frida-ps -U 2>/dev/null | grep -i exemplo | awk '{print $1}')
[ -n "$PID" ] && lldb -p "$PID" -o 'detach' -o 'quit' 2>&1 | tail -3
#    ⚠ "attach failed: Operation not permitted" = PT_DENY_ATTACH ativo
```

```bash
# ── 6. O VEREDITO ─────────────────────────────────────────
cat > protecoes.md <<'EOF'
# Protecoes — <app>
Nivel de analise: A | B · Jailbreak: sim | nao
| # | Protecao | Onde (classe/arquivo) | ⚠ O que TENTA impedir | ⚠ O que CONSEGUE |
|---|----------|----------------------|-----------------------|------------------|
## Contornos aplicados
| Protecao | Contorno | ⚠ Quebrou algo legitimo? |
|----------|----------|--------------------------|
## ⚠ HA ATTESTATION? (a unica protecao estrutural)
## ⚠ O que a protecao NAO impede
EOF
```

**O que observar:** no passo 1, a busca por `DCAppAttest` — ⚠ **se aparecer, o app tem a única proteção estrutural do curso**, e o relatório muda de tom. ⚠ E no passo 5, o resultado do `lldb`: ⚠ "Operation not permitted" é `PT_DENY_ATTACH` **funcionando** — e é a demonstração de que **esta** proteção **impede**, ao contrário das outras.

**Exercício 1:** complete o `protecoes.md` com **todas** as proteções encontradas, e a coluna "o que consegue" preenchida sem exagero. ⚠ Só uma delas merece a palavra "impede" — identifique qual.

**Exercício 2:** contorne **uma** proteção (passo 4) e escreva **o que quebrou** de legítimo. ⚠ Depois refaça o contorno de forma cirúrgica. É o custo do 9.2 na prática.

**Exercício 3 (o que vale):** responda a pergunta que fecha o curso: **as proteções deste app mudam o que um atacante consegue?** ⚠ Compare o resultado com a tabela do 9.6 e escreva, em um parágrafo, **o que impede o abuso** — o app, ou o servidor? ⚠ Se o app **não** tem `attestation`, diga o que **deveria** ter.

---

## Resumo

- ⚠ **Nenhuma proteção impede a análise; todas encarecem** — ⚠ **exceto `attestation`**, que é **fora do app**.
- ⚠ **A detecção de `jailbreak` é local e observável** — o nome da classe já a denuncia.
- ⚠ **A verificação de assinatura compara com um valor que está no app** — logo, é uma linha que se altera.
- ⚠ ⚠ **`PT_DENY_ATTACH` é a única proteção local que IMPEDE** — bloqueia o `lldb` de verdade.
- ⚠ **O contorno pode quebrar o app legítimo** — e precisa ser cirúrgico e refeito por versão.
- ⚠ **`App Attest` é estrutural:** a chave nasce no `SEP` e o **servidor** verifica.
- ⚠ **`cryptid = 1` exige decifrar** — e isso é Nível B; para app próprio, não há cifra.
- ⚠ **A proteção dificulta o trabalho EM ESCALA** — é o que ela realmente entrega.
- ⚠ **A pergunta do relatório:** o app **impede**, ou **encarece**? E onde está a verificação que decide?

---

## O que o próximo módulo entrega

Você sabe avaliar a proteção. O módulo 10 resolve a pergunta que atravessou o curso: **o que o simulador falseia** — e o que, por isso, só o dispositivo responde.
