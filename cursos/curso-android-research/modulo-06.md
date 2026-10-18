# Módulo 6 — Análise Dinâmica e Observação de Execução

**Curso:** Android Security Research: Internals e Engenharia Reversa
**Módulo:** 6 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 5
**Próximo:** Módulo 7 — Bibliotecas nativas

---

## O que este módulo entrega

Ao final, você vai saber **confirmar na execução** o que a leitura estática levantou — e **encontrar o que ela não viu**. Você vai observar comportamento sem instrumentar código, e vai saber **o que cada ferramenta de observação alcança e o que ela perde**.

---

## 6.1 As camadas de observação

⚠ **Antes de instrumentar, observar. E há cinco níveis, do mais barato ao mais invasivo:**

| Nível | ⚠ O que mostra | ⚠ O que não mostra |
|---|---|---|
| **`logcat`** | O que o app **escreve** | ⚠ O que ele **não** escreve |
| **`dumpsys`** | ⚠ Estado do sistema sobre o app | Lógica interna |
| ⚠ **Tráfego de rede** | O que **sai e entra** | ⚠ Se há TLS com pinning |
| ⚠ **`strace`** | ⚠ **Syscalls** — arquivo, socket, processo | Camada Java |
| **Arquivo em disco** | O que **persistiu** | O que foi apagado |

⚠ **A frase que organiza o módulo:**

> **A observação começa pelo que o app deixa no sistema — e só depois vai para dentro dele.**

⚠ **E a razão de começar por fora:** ⚠ `logcat`, tráfego e arquivo são **não invasivos** e não dependem de `root` nem de instrumentação. ⚠ Eles produzem **evidência** — e a evidência é o que o relatório precisa.

⚠ **A quarta linha é a ponte para o módulo 8:** ⚠ `strace` mostra o que o app **pede ao kernel** — e é a camada que **não depende de o app cooperar**.

---

## 6.2 `logcat`: o que o app diz de si

⚠ **Mais útil do que parece, e mais perigoso do que o autor imagina:**

```bash
# ⚠ Filtrar pelo PID do app (nao pelo nome do pacote)
PID=$(adb shell pidof com.exemplo.app)
adb logcat --pid="$PID" -v time

# Filtrar por tag
adb logcat -s MeuTag:V

# ⚠ Tudo que o app escreveu, e o que o sistema escreveu SOBRE ele
adb logcat | grep -iE 'com.exemplo.app|avc: denied|ActivityManager'
```

⚠ **As três informações que o `logcat` entrega, e cada uma é achado de naturezas diferentes:**

| Informação | ⚠ O que ela revela |
|---|---|
| Mensagem do próprio app | ⚠ Dado que **não deveria** ser logado |
| `ActivityManager` | ⚠ Qual componente foi invocado, por quem |
| ⚠ **`avc: denied`** | ⚠ ⚠ **Acesso negado pelo `SELinux`** |

⚠ **A primeira é a classe que aparece em app real:** ⚠ `Log.d("debug", "token=" + token)` é **vazamento**, e é achado — porque qualquer app com a permissão de leitura de log (ou o próprio `adb`) alcança. ⚠ É o log do módulo 11 do curso de Web Apps, no aparelho.

⚠ **E a terceira fecha o módulo 1:** ⚠ quando o app **tenta** algo e o `SELinux` nega, o aparelho **registra** — e a linha diz **qual domínio** tentou, **o quê**, e **contra qual tipo**. ⚠ É o que responde "por que isso falhou" quando a permissão está concedida.

```bash
# ⚠ O achado de log: o app imprime dado sensivel?
adb logcat -d | grep -iE 'token|senha|password|key|cpf|secret' | head -20
```

⚠ **A consulta acima é uma das mais produtivas em auditoria de app Android** — e não exige nada além do aparelho ligado.

---

## 6.3 O tráfego: o que sai e entra

⚠ **A camada mais reveladora, e a que o Curso 3 aprofunda.** Aqui, o essencial:

```
   APP ──► ⚠ HTTPS ──► SERVIDOR

   ⚠ PARA VER O CONTEUDO, e' preciso uma das tres:
     1. proxy com CA instalada  (⚠ o app precisa aceitar)
     2. proxy + network security config  (⚠ so em app DEPURAVEL)
     3. ⚠ hook no ponto de confianca      (modulo 8)
```

⚠ **A segunda linha é a que muda no lab:** ⚠ um app **depurável** aceita CA de usuário; um app de **produção** com `networkSecurityConfig` restritivo **não**. ⚠ É por isso que o lab usa o app próprio.

⚠ **E a terceira é a que o módulo 8 resolve:** ⚠ quando o app **fixa** o certificado (pinning), o proxy não funciona — e a resposta é **instrumentar** o ponto onde a verificação acontece.

```bash
# ⚠ O proxy, no aparelho
#    no seu computador:  mitmproxy -p 8080
adb shell settings put global http_proxy <SEU_IP>:8080

#    e a CA — so funciona se o app ACEITAR
#    ⚠ em Android moderno, app de producao NAO aceita CA de usuario
adb push ca-cert.pem /sdcard/
#    instale via Configuracoes > Seguranca > Criptografia

# ⚠ o que fazer quando NAO funciona
adb logcat | grep -iE 'SSLHandshake|CertPathValidator|Trust'
```

⚠ **A última consulta é diagnóstica:** ⚠ se o app recusa, o log diz **por quê** — e a mensagem é o **ponto de partida** para o módulo 8.

⚠ **E a observação que independe de TLS:** ⚠ mesmo com pinning, você vê **para onde** o app fala — IP, porta, SNI, volume e frequência.

```bash
# ⚠ QUEM o app contata, sem decifrar nada
adb shell "cat /proc/net/tcp" | head
#    (⚠ endereços em hex — 0100007F:1F90 = 127.0.0.1:8080)

# ⚠ e por strace, no aparelho com root
adb shell su -c 'strace -f -e trace=connect,sendto -p <PID>' 2>&1 | head -20
```

⚠ **A segunda consulta é a que o módulo entrega como habilidade:** ⚠ `connect` e `sendto` mostram **destino e origem** — e funcionam **mesmo com TLS**, porque operam **abaixo** dele.

---

## 6.4 `strace`: a camada que não depende do app

⚠ **A ferramenta que atravessa todas as camadas de aplicação:**

| Syscall | ⚠ O que ela revela |
|---|---|
| **`openat`** | ⚠ ⚠ **Qual arquivo o app abriu** — e em que modo |
| `connect` / `sendto` | ⚠ ⚠ Para onde falou |
| `execve` | ⚠ ⚠ **Se executou processo** — achado forte |
| `unlink` / `rename` | O que apagou ou moveu |
| `chmod` / `chown` | Permissão que aplicou |
| ⚠ `ptrace` | ⚠ ⚠ **Se está tentando se proteger** |

⚠ **A primeira linha é onde o módulo 9 se apoia:** ⚠ `openat` mostra **o caminho exato** do arquivo que o app abriu — e é assim que você descobre **onde** ele guarda o dado, **sem ler o código**.

⚠ **A última é a mais interessante para o módulo 10:** ⚠ um app que chama `ptrace` está tentando **impedir depuração**. ⚠ A syscall **denuncia** a proteção — e é a razão de a proteção **não impedir**, só **encarecer**.

```bash
# ⚠ O que o app abre, em tempo real
adb shell su -c 'strace -f -e trace=openat,connect,execve -p <PID>' 2>&1 \
  | grep -vE 'ENOENT|/system/|/apex/|\.so$' | head -30
# ⚠ o filtro remove o ruido; o que sobra e' do app

# ⚠ e a prova de que o app tenta se proteger
adb shell su -c 'strace -f -p <PID>' 2>&1 | grep -i ptrace | head
```

⚠ **A última consulta é a demonstração mais direta do módulo 10:** ⚠ se o app chama `ptrace(PTRACE_TRACEME)`, ele está **detectando depurador** — e você **viu a proteção trabalhando**, sem ler uma linha de código.

---

## 6.5 O método: confirmar a hipótese

⚠ **O ciclo que liga o módulo 5 a este:**

```
   HIPOTESE (modulo 5)              ⚠ CONFIRMACAO (aqui)
   ───────────────────              ────────────────────

   "o extra nao e' validado"   ──►  envie o extra e observe
                                     ⚠ o efeito DEVE ocorrer

   "ha SQL injection no        ──►  envie o dado e observe
    provider"                        a consulta resultante

   "o app guarda em            ──►  ⚠ strace no openat
    SharedPreferences"               + leia o arquivo

   ⚠ Se o efeito NAO ocorre:
       a hipotese esta errada, OU
       ⚠ a protecao existe (modulo 10)
```

⚠ **A última linha é a distinção que evita conclusão errada:** ⚠ "não funcionou" tem **duas** causas possíveis — e confundi-las produz **falso negativo**. ⚠ É a mesma disciplina do módulo 4 do curso de Linux Internals: ⚠ taxa zero não significa "não é bug".

⚠ **E a evidência, no formato do curso:** ⚠ requisição (o comando `am`), identidade (**o app chamador**), e resposta (o efeito observado). ⚠ Sem os três, é impressão.

⚠ **O que registrar, sempre:**

| Item | ⚠ Por quê |
|---|---|
| Versão do Android | ⚠ Comportamento muda |
| Modelo / emulador | ⚠ Módulos 7 e 10 exigem físico |
| ⚠ **PID e uid** | ⚠ Identifica o processo observado |
| Comando **completo** | ⚠ Reproduzível |
| ⚠ **A saída bruta** | ⚠ Evidência, não resumo |

---

## Laboratório 6 — Observar a execução

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Aparelho com `root` recomendado para os passos 3 e 4.**

```bash
mkdir -p ~/android-lab/m06 && cd ~/android-lab/m06
adb install -r ../m03/alvo/app-release.apk
```

```bash
# ── 1. LOGCAT — o que o app diz, e o que o sistema diz dele ──
adb logcat -c                                     # limpa
adb shell am start -n com.exemplo.app/.MainActivity
sleep 2
adb logcat -d | grep -iE 'com.exemplo.app' | tail -30

# ⚠ o achado de log: dado sensivel impresso?
adb logcat -d | grep -iE 'token|senha|password|secret|cpf|key' | head
```

```bash
# ── 2. ⚠ O SISTEMA SOBRE O APP — dumpsys ───────────────────
adb shell dumpsys activity activities | grep -A5 com.exemplo.app | head -20
adb shell dumpsys package com.exemplo.app | grep -E 'granted|userId'

# ⚠ quem invocou o componente?
adb logcat -d | grep -iE 'ActivityManager.*com.exemplo.app' | tail -10
```

```bash
# ── 3. ⚠ STRACE — o que o app PEDE ao kernel ───────────────
PID=$(adb shell pidof com.exemplo.app)
echo "PID: $PID"

adb shell su -c "strace -f -e trace=openat,connect,execve -p $PID" 2>&1 \
  | grep -vE 'ENOENT|/system/|/apex/|/dev/|\.so$|/proc/' | head -30
# ⚠ rode um comando no app enquanto isso, para ver a atividade

# ⚠ e a protecao, se houver
adb shell su -c "strace -f -p $PID" 2>&1 | grep -i ptrace | head -5
```

```bash
# ── 4. ⚠ A REDE — para onde ele fala ───────────────────────
#    mesmo sem TLS, da' para ver o DESTINO
adb shell "cat /proc/net/tcp" | head -10
#    ⚠ decodifique o hex: porta em hex, endereco em hex
python3 - <<'EOF'
import struct
for linha in ["0100007F:1F90", "0A00020F:0050"]:
    ip_h, porta_h = linha.split(":")
    ip = socket_hex = int(ip_h, 16)
    print(f"{'.'.join(str((ip>>s)&0xff) for s in (0,8,16,24))}:{int(porta_h,16)}")
EOF

# ⚠ e o volume: quantas conexoes, para quantos destinos
adb shell "cat /proc/net/tcp /proc/net/tcp6" | awk 'NR>1{print $3}' | sort | uniq -c | sort -rn | head
```

```bash
# ── 5. ⚠ CONFIRME uma hipotese do modulo 5 ─────────────────
cat ../m05/leitura.md

#    ⚠ escolha uma entrada e provoque:
adb shell am start -n com.exemplo.app/.PerfilActivity --es usuario_id "999"
sleep 1
adb logcat -d | grep -iE 'PerfilActivity|usuario_id|perfil' | tail -10

#    ⚠ o efeito esperado ocorreu?
#    ⚠ se NAO: a hipotese esta errada, ou ha protecao
```

```bash
# ── 6. O REGISTRO — a evidencia ────────────────────────────
cat > evidencia.md <<'EOF'
# Confirmacao dinamica — <app>
Android: <versao> · Aparelho: <modelo/emulador> · uid: <n>

| Hip. | Comando | ⚠ Efeito observado | Veredito |
|------|---------|--------------------|----------|
|      |         |                    |          |

## ⚠ Hipoteses NAO confirmadas — e por que
| Hip. | O que aconteceu | ⚠ Hip. errada ou PROTECAO? |
|------|-----------------|----------------------------|
EOF
```

**O que observar:** no passo 3, o `openat` mostra **o caminho exato** dos arquivos que o app abre. ⚠ É assim que você descobre **onde ele guarda dado** — e é o que o módulo 9 vai mapear por completo. ⚠ E no passo 4, o destino aparece **mesmo sem decifrar TLS**, porque `connect` está **abaixo** dele.

**Exercício 1:** preencha a tabela de confirmação do passo 6, com **requisição, identidade e efeito** em cada linha.

**Exercício 2:** para cada hipótese **não** confirmada, decida entre **"hipótese errada"** e **"proteção existe"** — e diga **qual comando** distinguiria as duas. ⚠ Errar essa distinção é o falso negativo do curso.

**Exercício 3 (o que vale):** rode o `strace` com filtro `write` e capture **o conteúdo** que o app escreve em socket. ⚠ Se ele é legível, explique por que — e o que o app **deveria** ter feito. É o exercício que liga este módulo ao Curso 3, onde a comunicação é o tema.

---

## Resumo

- ⚠ **A observação começa por fora:** `logcat`, tráfego e arquivo são **não invasivos** e produzem evidência.
- ⚠ **`logcat` entrega três coisas:** mensagem do app (dado logado = achado), ação do `ActivityManager`, e ⚠ **`avc: denied`**.
- ⚠ **Filtrar log por `key|token|senha`** é uma das consultas mais produtivas em auditoria de app.
- ⚠ **Ver o tráfego exige uma das três:** CA aceita, app depurável, ou **hook** (módulo 8).
- ⚠ **O destino aparece mesmo com TLS** — `connect` e `/proc/net/tcp` estão **abaixo** da cifra.
- ⚠ **`strace` atravessa as camadas:** `openat` revela **onde o dado é guardado**, e **`ptrace` denuncia a proteção**.
- ⚠ **"Não funcionou" tem duas causas** — hipótese errada ou proteção —, e confundi-las é **falso negativo**.
- ⚠ **A evidência tem três partes:** requisição, identidade e efeito observado.

---

## O que o próximo módulo entrega

Você sabe confirmar comportamento. O módulo 7 entra **onde o difícil mora**: bibliotecas nativas — `.so`, a chamada `JNI`, símbolo e análise de código compilado.
