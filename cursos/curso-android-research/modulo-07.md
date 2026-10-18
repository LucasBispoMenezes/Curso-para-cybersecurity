# Módulo 7 — Bibliotecas Nativas: `.so`, `JNI` e Análise

**Curso:** Android Security Research: Internals e Engenharia Reversa
**Módulo:** 7 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 6 (inclui Assembly e RE)
**Próximo:** Módulo 8 — Depuração e instrumentação

---

## O que este módulo entrega

Ao final, você vai saber **entrar no código nativo** — encontrá-lo a partir do Java, lê-lo na desmontagem, e analisar a fronteira `JNI` onde o dado atravessa entre dois mundos. É onde o código sensível costuma estar, e onde as proteções do runtime **não chegam**.

---

## 7.1 Por que o nativo é onde o difícil mora

⚠ **Três razões, e cada uma explica o que você vai encontrar lá:**

| Razão | ⚠ Consequência para a análise |
|---|---|
| **Desempenho** | Parser, cripto, codec — lógica densa |
| ⚠ **Proteção** | ⚠ Ofuscação de DEX é contornável; o `.so` **não é DEX** |
| **Reuso** | A mesma biblioteca em vários apps |
| ⚠ **Histórico** | ⚠ Código antigo, com falha antiga |

⚠ **A segunda é a que traz você aqui:** ⚠ mover a lógica para o nativo **não a esconde** — apenas **muda a ferramenta**. ⚠ E o `.so` continua no APK, legível por `objdump`/`ghidra`, como qualquer binário do curso de `Assembly e RE`.

⚠ **A frase que organiza o módulo:**

> **O `.so` não é uma caixa preta — é um binário compilado, com os mesmos defeitos de todo
> código nativo, e a mesma disciplina de leitura.**

⚠ **E a ligação com o resto da trilha:** ⚠ as falhas que você vai achar aqui são **as do `C para Pesquisa`** (memória, tamanho, ponteiro) e **as do `Windows Internals`** (método, validação, contrato). ⚠ O que muda é a **fronteira**: o dado vem do lado **Java**, e a conversão é o ponto de falha.

---

## 7.2 Encontrar o nativo a partir do Java

⚠ **O caminho, e ele começa no DEX:**

```
   1. grep 'loadLibrary'   ⚠ qual .so e' carregado
        │
        ▼
   2. grep 'native '       ⚠ quais METODOS sao nativos
        │
        ▼
   3. ⚠ A ASSINATURA       ⚠ o nome da funcao deriva do pacote+classe+metodo
        │
        ▼
   4. unzip lib/<abi>/      ⚠ o arquivo
        │
        ▼
   5. nm / objdump          ⚠ o SIMBOLO existe?
```

⚠ **O passo 3 é o que quase ninguém faz à mão, e é o que economiza tempo.** ⚠ O nome segue uma convenção:

```
   Java_com_exemplo_app_Minha_classe_nativo
   │      └──── pacote com _ ────┘ └classe┘ └metodo┘
   └─────────── ⚠ sempre este prefixo
```

⚠ **Além do nome, existe a **assinatura** (`JNIEXPORT`, tipo de retorno, `JNIEnv*`, `jobject`). ⚠ E existe a variante **registrada em runtime** — `RegisterNatives` —, onde o nome **não segue** a convenção. ⚠ É a primeira coisa que você procura quando **não acha** o símbolo.

```bash
# 1. As bibliotecas carregadas
grep -rn 'loadLibrary' ../m05/app_jadx/sources/ | head

# 2. Os metodos nativos
grep -rn 'native ' ../m05/app_jadx/sources/ | grep -v '//' | head -20

# 3. ⚠ A ponte: o nome da funcao no .so
#    (⚠ o app do lab usa um metodo nativo — descubra o nome)

# 4. O arquivo
unzip -l ../m05/app.apk | grep '\.so$'

# 5. O simbolo existe?
mkdir -p libs && cd libs && unzip -o ../m05/app.apk 'lib/*' >/dev/null
for f in lib/*/*.so; do
  echo "── $f"
  file "$f"
  nm -D "$f" 2>/dev/null | grep -i 'Java_' | head -5
done
```

⚠ **A última linha é a que responde "está tudo aqui?"** ⚠ `nm -D` lista os símbolos **exportados** — e se o nome `Java_*` aparece, a convenção foi seguida. ⚠ Se **não** aparece, o app usa `RegisterNatives` — e o caminho é outro.

---

## 7.3 A fronteira `JNI`: onde o dado atravessa

⚠ **É aqui que o achado mora. A conversão entre Java e nativo tem contrato próprio, e o contrato é onde a falha aparece:**

| Direção | ⚠ O que exige cuidado |
|---|---|
| Java → nativo (**string**) | ⚠ `GetStringUTFChars` + `Release` |
| Java → nativo (**array**) | ⚠ `GetArrayLength` + `Get*ArrayElements` |
| Java → nativo (**objeto**) | ⚠ `GetFieldID` + `Get*Field` — tipo pode não bater |
| nativo → Java (**retorno**) | ⚠ Criar referência local/global corretamente |
| ⚠ **nativo chama Java** | ⚠ ⚠ Exceção pendente derruba o processo |

⚠ **As quatro primeiras são as do `C para Pesquisa`:** ⚠ tamanho, ponteiro, tipo. ⚠ A conversão **não valida** — ela **traduz**. ⚠ Quem valida é o código do app, e é aí que falta.

⚠ **A quinta é a específica de `JNI`, e é a que surpreende:** ⚠ uma exceção Java lançada por código chamado do nativo **fica pendente** — e se o nativo continua executando sem checar, o comportamento é indefinido. ⚠ É o mínimo, mas **dentro de uma fronteira que o runtime não protege**.

```c
// ⚠ VULNERAVEL — o padrao que voce vai encontrar
JNIEXPORT jbyteArray JNICALL
Java_com_exemplo_app_Minha_decifra(JNIEnv *env, jobject thiz, jbyteArray entrada) {
    jsize n = (*env)->GetArrayLength(env, entrada);        // ⚠ tamanho do lado JAVA
    jbyte *p = (*env)->GetByteArrayElements(env, entrada, NULL);

    jbyte saida[256];                                       // ⚠ buffer FIXO
    // ⚠ nenhuma conferencia de n contra 256
    memcpy(saida, p, n);                                    // ⚠ estoura se n > 256

    (*env)->ReleaseByteArrayElements(env, entrada, p, JNI_ABORT);

    jbyteArray r = (*env)->NewByteArray(env, n);
    (*env)->SetByteArrayRegion(env, r, 0, n, saida);
    return r;
}
```

⚠ **A falha é exatamente a do módulo 2 do Windows Internals:** ⚠ **o tamanho vem de fora, e ninguém confere**. ⚠ A fronteira é nova; a classe é a mesma — e a correção também:

```c
// ✅ CORRIGIDO
    jsize n = (*env)->GetArrayLength(env, entrada);
    // ⚠ 1. LIMITE antes de qualquer copia
    if (n > sizeof(saida)) {
        jclass ex = (*env)->FindClass(env, "java/lang/IllegalArgumentException");
        if (ex) (*env)->ThrowNew(env, ex, "entrada grande demais");
        return NULL;
    }
    // 2. copia UMA vez, com o tamanho conferido
    memcpy(saida, p, n);
```

⚠ **E a validação **precisa** vir antes:** ⚠ depois do `memcpy`, o dano já aconteceu — é o módulo 1 do curso de Linux Internals, na fronteira `JNI`.

---

## 7.4 Ler o `.so`

⚠ **A mesma disciplina do curso de `Assembly e RE`, aplicada a um binário Android:**

| Passo | ⚠ O que você faz |
|---|---|
| **1. Identifique** | `file` — arquitetura, `ELF`, `PIE`/`static` |
| **2. Símbolos** | ⚠ `nm` — o que é exportado |
| **3. Dependências** | ⚠ `readelf -d` — que bibliotecas ele chama |
| ⚠ **4. Strings** | ⚠ ⚠ **A mensagem denuncia a lógica** |
| **5. Desmontagem** | `objdump -d`, `ghidra` |
| ⚠ **6. Comparação** | ⚠ `nm` entre versões — o que mudou |

⚠ **A quarta linha é a que rende primeiro, e por isso vale sublinhar:** ⚠ uma `.so` que faz criptografia **contém o nome do algoritmo**; uma que faz validação **contém a mensagem de erro**; uma que faz requisição **contém a URL**. ⚠ As strings são **mais informativas** que a desmontagem, e levam minutos.

```bash
cd libs
ALVO=$(find lib -name '*.so' | head -1)
echo "══ arquivo"; file "$ALVO"
echo "══ exportados"; nm -D "$ALVO" 2>/dev/null | head -20
echo "══ dependencias"; readelf -d "$ALVO" 2>/dev/null | grep NEEDED
echo "══ strings relevantes"
strings -n 6 "$ALVO" | grep -iE 'http|key|senha|password|token|err|invalid|'\
'fail|debug|root|frida|magisk|su\b' | head -30
```

⚠ **O filtro da última linha é o mapa do módulo 10:** ⚠ strings com `root`, `frida`, `magisk`, `su` indicam **detecção** — e a `.so` costuma ser onde ela mora. ⚠ É o mesmo olhar que o módulo 12 do curso de Windows Internals aplicou a `LOLBin`.

⚠ **E a comparação entre versões merece o destaque:** ⚠ duas versões da mesma `.so` dizem **o que o autor corrigiu** — e, por consequência, **o que era bug**. ⚠ É o `Patch Diffing` aplicado a biblioteca nativa, e é o caminho mais rápido para entender uma correção.

---

## 7.5 `RegisterNatives`: quando o símbolo não aparece

⚠ **A variante que confunde a primeira leitura:**

```c
// ⚠ Registro EXPLICITO — o nome da funcao NAO segue a convencao
static JNINativeMethod metodos[] = {
    { "nativo", "(Ljava/lang/String;)Ljava/lang/String;", (void*)minha_funcao },
    //    ⚠ o nome Java        ⚠ a assinatura (tipo)              ⚠ a funcao real
};

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *reserved) {
    // ⚠ aqui o app registra — e o `nm` nao mostra "Java_"
    (*env)->RegisterNatives(env, classe, metodos, 1);
    return JNI_VERSION_1_6;
}
```

⚠ **As três consequências, e cada uma muda a busca:**

| Fato | ⚠ O que fazer |
|---|---|
| Sem símbolo `Java_*` | ⚠ Procure `JNI_OnLoad` |
| ⚠ Nome da função é livre | ⚠ O mapa está em **`metodos[]`** |
| ⚠ **A assinatura está na tabela** | ⚠ Ela diz o **tipo** do dado |

⚠ **A terceira é a que dá informação:** ⚠ a assinatura `(Ljava/lang/String;)Ljava/lang/String;` diz que a função recebe **uma string** e devolve **uma string** — e é com isso que você identifica **o que ela trata** na desmontagem.

⚠ **E o padrão de proteção associado:** ⚠ `JNI_OnLoad` é também onde o app costuma **verificar integridade**, **detectar `root`** e **decifrar strings**. ⚠ É a primeira função a ler, em qualquer `.so` ofuscado.

```bash
# ⚠ A busca, quando o nm nao acha "Java_"
nm -D "$ALVO" | grep -i 'JNI_OnLoad'
strings -n 4 "$ALVO" | grep -E '\(L?[a-zA-Z/]*;?\)L?[a-zA-Z/]*;?' | head -20
#    ⚠ as assinaturas de metodo aparecem como string literal
```

---

## 7.6 O relatório do nativo

⚠ **O formato, e ele tem a linha que liga este módulo ao 4:**

```
ANALISE DE BIBLIOTECA NATIVA
──────────────────────────────────────────────────────────
Arquivo:     lib/<abi>/libX.so   (abas: arm64-v8a, armeabi-v7a)
Origem:      ⚠ carregado por <Classe>.java:<linha>
Metodo(s):   ⚠ assinatura Java -> funcao nativa
Linkagem:    convencao | ⚠ RegisterNatives (JNI_OnLoad)
                    │
INTERFACE:   o que entra, o que sai, e ⚠ o CONTRATO
                    │
O QUE FAZ:   ⚠ dado pelo nome + strings + desmontagem
DEFEITO:     ⚠ a linha — tamanho, ponteiro, ou tipo
                    │
⚠ PROTECAO:  root? integridade? ofuscacao? (modulo 10)
──────────────────────────────────────────────────────────
```

⚠ **A linha `INTERFACE` é o que conecta ao módulo 4:** ⚠ a função nativa é **alcançável a partir do Java**, e o Java é alcançável **por outro app**. ⚠ Isso significa que um defeito no nativo pode ser **gatilhado remotamente** por um `Intent` — e é essa a conclusão que o relatório precisa alcançar.

⚠ **E a última linha é a que prepara o módulo 10:** ⚠ o `.so` é onde a proteção mora, e é onde você vai procurá-la.

---

## Laboratório 7 — Ler o `.so`

⚠ **Não testado em ambiente isolado. Valide antes de publicar.**
⚠ **Análise estática de binário — nada é executado.**

```bash
mkdir -p ~/android-lab/m07 && cd ~/android-lab/m07
cp ../m05/app.apk .
mkdir -p libs && cd libs && unzip -o ../app.apk 'lib/*' >/dev/null
ls lib/
```

```bash
# ── 1. IDENTIFICAR ─────────────────────────────────────────
for f in lib/*/*.so; do
  printf "%-40s " "$f"
  file -b "$f" | cut -c1-60
done
# ⚠ anote: quantas arquiteturas? PIE? stripped?
```

```bash
# ── 2. ⚠ A PONTE: do Java para o simbolo ───────────────────
echo "══ loadLibrary no Java"
grep -rn 'loadLibrary' ../../m05/app_jadx/sources/ | head

echo "══ metodos native"
grep -rn 'native ' ../../m05/app_jadx/sources/ | grep -v '//' | head

echo "══ simbolos Java_* no .so"
for f in lib/*/*.so; do
  echo "── $f"; nm -D "$f" 2>/dev/null | grep 'Java_' | head -5
done
# ⚠ se NAO aparecer Java_*, procure JNI_OnLoad -> RegisterNatives
```

```bash
# ── 3. ⚠ STRINGS — o mapa rapido ───────────────────────────
ALVO=$(find lib -name '*.so' | head -1)
echo "══ strings de logica"
strings -n 5 "$ALVO" | grep -iE 'http|https|\.exemplo|key|senha|token|'\
'decrypt|encrypt|aes|hmac|sha' | head -20

echo "══ ⚠ strings de PROTECAO (modulo 10)"
strings -n 4 "$ALVO" | grep -iE 'frida|magisk|root|/su|ptrace|debug|'\
'tamper|integrity|xposed' | head -20
```

```bash
# ── 4. DEPENDENCIAS e SUPERFICIE ───────────────────────────
readelf -d "$ALVO" | grep NEEDED
readelf -h "$ALVO" | grep -E 'Type|Machine'
nm -D "$ALVO" | wc -l          # quantos simbolos exportados

# ⚠ e as funcoes de risco
nm -D "$ALVO" | grep -iE 'memcpy|strcpy|sprintf|system|exec|dlopen|'\
'popen|malloc' | head
# ⚠ cada uma dessas em um exportado e' candidato
```

```bash
# ── 5. DESMONTAGEM — a funcao nativa ───────────────────────
FUNC=$(nm -D "$ALVO" | grep 'Java_' | head -1 | awk '{print $3}')
echo "funcao: $FUNC"
objdump -d --disassemble="$FUNC" "$ALVO" 2>/dev/null | head -60

# ⚠ PROCURE, na desmontagem:
#    - `cmp` contra um limite ANTES de um memcpy
#    - chamada a GetArrayLength seguida de uso
#    - ⚠ a AUSENCIA de comparacao
```

```bash
# ── 6. O RELATORIO ─────────────────────────────────────────
cat > nativo.md <<'EOF'
# Analise de biblioteca nativa — <lib>.so
Arquivo:
Origem (Java):
Metodo / assinatura:
Linkagem: convencao | RegisterNatives
## Interface
| Entra | Sai | ⚠ Contrato |
|-------|-----|------------|
## O que faz (evidencia: nome + strings + desmontagem)
## ⚠ Defeito — a linha
## Protecoes encontradas (modulo 10)
EOF
```

**O que observar:** no passo 3, as **strings de proteção**. ⚠ Se o `.so` contém `frida`, `magisk` ou `ptrace`, você achou **o mecanismo do módulo 10** — sem ler uma instrução. ⚠ E no passo 5, a busca pela **comparação antes do `memcpy`**: a ausência dela é o defeito, e ela é visível na desmontagem.

**Exercício 1:** complete o `nativo.md`, com a linha `INTERFACE` preenchida — o que entra, o que sai, e **o contrato**.

**Exercício 2:** rastreie **o caminho completo** do dado: de um `extra` de `Intent` (módulo 3) até a função nativa. ⚠ Escreva os três saltos (Java → `native` → `JNI`) e **onde falta verificação** em cada um.

**Exercício 3 (o que vale):** escolha **uma** função exportada de risco (passo 4) e responda: **ela é alcançável a partir do Java?** ⚠ Se sim, e se o defeito dela é de tamanho, escreva **o caminho remoto** até o defeito — de outro app ao buffer. É a conclusão que o módulo 11 vai reportar.

---

## Resumo

- ⚠ **O nativo é onde o código sensível mora** — e não é caixa preta: é binário legível.
- ⚠ **Encontrar o nativo é mecânico:** `loadLibrary` → `native` → **convenção de nome** → `nm -D`.
- ⚠ **A fronteira `JNI` traduz, não valida** — e é aí que a falha aparece: tamanho, ponteiro, tipo.
- ⚠ **A validação tem de vir ANTES da cópia** — depois, o dano já aconteceu.
- ⚠ **Strings rendem antes da desmontagem:** URL, algoritmo, mensagem de erro e **nome de proteção**.
- ⚠ **A comparação entre versões da `.so`** diz o que o autor corrigiu — e o que era bug.
- ⚠ **Sem símbolo `Java_*`?** Procure `JNI_OnLoad` e a tabela `RegisterNatives` — o mapa e as assinaturas estão lá.
- ⚠ **O `.so` é onde a proteção mora** — e as strings a denunciam.

---

## O que o próximo módulo entrega

Você sabe ler o nativo. O módulo 8 ensina a **instrumentar**: `Frida`, `JDWP`, `gdb` — o que cada um alcança, e como confirmar o que a leitura levantou.
