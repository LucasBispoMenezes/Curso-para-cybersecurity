# Módulo 7 — Análise de Malware e Ofuscação

**Carga:** 2 horas (45 min teoria · 1h15 lab)
**Pré-requisitos:** Módulos 1 a 6

---

## Objetivos

1. Reconhecer sinais de empacotamento sem executar o binário.
2. Identificar técnicas de anti-análise e entender o que cada uma tenta impedir.
3. Entender a diferença entre análise estática e dinâmica, e quando cada uma é obrigatória.
4. Adotar um protocolo de segurança para manusear amostra desconhecida.
5. Reconhecer comportamento malicioso por importações e strings, sem executar nada.

---

## ⚠ Protocolo de segurança — leia antes de qualquer coisa

Este módulo ensina a **reconhecer** malware, não a operá-lo. A regra é absoluta:

**Nunca execute amostra desconhecida fora de ambiente isolado.** E "isolado" tem definição
técnica:

| Requisito | Por quê |
|---|---|
| VM dedicada, snapshots antes de cada análise | Reverter estado depois |
| **Sem rede** (ou rede simulada controlada) | Impede C2 e propagação |
| **Sem disco compartilhado, sem clipboard compartilhado** | Impede escape para o host |
| Sem credenciais reais, sem tokens, sem chaves SSH | Impede roubo do que está no ambiente |
| Sem acesso a sistemas de produção | Óbvio, e violado com frequência |
| VM descartável após a análise | Não confie em limpeza |

**Análise estática (sem executar) é sempre a primeira escolha.** Ela não oferece risco nenhum se
você não abrir o arquivo em programa vulnerável. Análise dinâmica só depois, e só com o protocolo
acima.

⚠ **Nada neste curso usa malware real.** Os alvos são programas escritos para o curso que imitam
técnicas — comportamento conhecido, risco zero. Se você quiser treinar com amostra real depois,
existem repositórios públicos de amostras (como o MalwareBazaar) com procedimento próprio. Use
VM descartável sem rede, e nunca a sua máquina de trabalho.

⚠ **Aspecto legal:** analisar malware é atividade legítima e importante — é o que permite que
antivírus existam. Baixar, armazenar e analisar amostra em ambiente controlado para fins de
pesquisa e defesa é uma coisa; usar o que você aprendeu aqui para atacar alguém é crime
(Código Penal, art. 154-A e correlatos). O conhecimento é o mesmo. O que difere é a intenção e a
autorização.

---

## 7.1 A primeira triagem: está empacotado?

*Packing* comprime ou cifra o código real e coloca um *stub* que o descomprime em memória antes
de executar. Consequência: **o que você vê no arquivo não é o código que roda.** Análise estática
do trecho empacotado é inútil até você desempacotar.

### Sinais de empacotamento

| Sinal | O que indica |
|---|---|
| Muito poucas strings legíveis | Texto cifrado ou comprimido |
| Entropia alta em `.text` (próxima de 8.0) | Dados cifrados ou comprimidos |
| `.text` com seção de escrita | Stub precisa descomprimir em área gravável |
| Tamanho do arquivo >> tamanho das seções | Payload escondido em espaço não mapeado |
| `UPX0`, `UPX1`, `.aspack`, `.themida` nas seções | Packer comercial conhecido |
| Poucas importações (só `LoadLibrary`/`GetProcAddress`) | Resolução dinâmica de API |
| `Entry point` fora de `.text` | Stub em seção própria |
| Virtual size >> raw size numa seção | Descomprime em tempo de execução |

```bash
# Entropia por seção (aproximada)
for s in $(readelf -S binario | awk '/\[ *[0-9]+\]/{print $2}' | tr -d '[]'); do
    echo -n "$s: "
    objdump -s -j "$s" binario 2>/dev/null | tail -n +5 \
      | awk '{for(i=2;i<=5;i++) printf "%s", $i}' \
      | python3 -c "
import sys, math, collections
d = bytes.fromhex(sys.stdin.read().strip() or '00')
if not d: print('vazio'); sys.exit()
c = collections.Counter(d)
e = -sum((n/len(d)) * math.log2(n/len(d)) for n in c.values())
print(f'{e:.2f}')"
done
```

Entropia acima de ~7.2 em `.text` é sinal forte de cifra ou compressão.

### UPX: o caso fácil

```bash
upx -d binario -o desempacotado     # se for UPX e a versão for conhecida
file desempacotado
strings -n 8 desempacotado | head -20
```

UPX é um packer legítimo e reversível trivialmente. Packer customizado ou comercial não é — e aí
a análise dinâmica é o caminho.

### Desempacotamento dinâmico (conceito)

O conceito, sem executar nada neste curso: você põe um breakpoint depois do loop de
descompressão, e **despeja a memória do processo**. O código descomprimido está lá.

Em GDB, o conceito é:

```
(gdb) info proc mappings          # veja as regiões de memória
(gdb) dump memory dump.bin 0x400000 0x500000
```

Ou, mais cirúrgico: breakpoint em `mprotect` (que o stub usa para tornar a região executável),
e dumps depois. Este é o procedimento real de desempacotamento dinâmico.

⚠ **Fazer isso com malware real significa executá-lo.** Só no ambiente isolado do protocolo
acima. Não é exercício de laboratório deste curso.

---

## 7.2 Anti-análise

Técnicas que o binário usa para dificultar a análise. Reconhecê-las é o objetivo.

### Detecção de depurador

| Técnica | Como aparece |
|---|---|
| `ptrace(PTRACE_TRACEME)` | Syscall falha se já há um tracer |
| Ler `/proc/self/status` e checar `TracerPid` | Abertura de arquivo + comparação |
| `ptrace(PTRACE_PEEKUSER)` em si mesmo | Verificação de flags de debug |
| Medir tempo entre instruções | `rdtsc` duas vezes e subtrair |
| Detectar breakpoints (byte `0xCC`) | Lê o próprio `.text` e procura `0xCC` |

**Leitura prática:** um binário que abre `/proc/self/status`, lê um campo e compara com zero
está checando `TracerPid`. Isso aparece em `strace` imediatamente:

```bash
strace -e trace=openat,ptrace ./binario 2>&1 | head -20
```

### Ofuscação de fluxo

**Chamadas indiretas:** em vez de `call funcao`, o binário calcula o endereço:

```asm
lea  rax, [rip+offset]
add  rax, rbx
call rax
```

Isso quebra a análise estática: o analisador não sabe para onde vai. Você tem que seguir o
cálculo do endereço.

**Flattening de fluxo de controle:** o `switch` real é escondido num dispatcher. Todo o código
vira um case de uma máquina de estados, e o fluxo é determinado por uma variável de estado:

```asm
.loop:
    cmp  DWORD PTR [rbp-0x4], 3      ; estado atual
    je   .case3
    cmp  DWORD PTR [rbp-0x4], 7
    je   .case7
    ...
```

O código original é ilegível: uma cadeia de estados em vez de estrutura.

**Junk code / opaque predicates:** instruções que não fazem nada útil, e predicados que sempre
resultam no mesmo valor mas o analisador não consegue provar:

```asm
mov  eax, 5
imul eax, eax, 4
add  eax, 3
and  eax, 0xffffffff
test eax, eax
jz   .nunca_executa          ; sempre falso, mas obscurece o fluxo
```

### Anti-VM e anti-sandbox

- Procurar strings de ambiente de virtualização (`VBOX`, `VMware`, `QEMU`);
- Verificar timers (sandbox acelera o tempo);
- Checar número de CPUs, RAM, tamanho do disco;
- Detectar ausência de interação de usuário;
- Detectar ambiente de análise pelo nome do usuário ou hostname.

### Criptografia de strings

Strings não aparecem em claro — são cifradas e decifradas em runtime:

```asm
; Padrão típico: XOR de string com chave de 1 byte
lea  rsi, [rip+dados_cifrados]
mov  ecx, 12
xor_loop:
    xor  BYTE PTR [rsi+rax], 0x42     ; chave
    inc  rax
    cmp  rax, rcx
    jl   xor_loop
```

**Isso explica strings ilegíveis em `strings`.** Você pode decifrar estaticamente replicando o
loop em Python: extraia os bytes, aplique o mesmo XOR, leia o resultado.

---

## 7.3 与 Reconhecimento por importações e strings

Antes de ler assembly, a lista de imports conta a história.

### Importações suspeitas

| Função | Por que interessa |
|---|---|
| `VirtualAlloc` / `mmap` com `PROT_EXEC` | Alocar memória executável — injeção |
| `WriteProcessMemory` / `ptrace(PTRACE_POKETEXT)` | Escrever em outro processo — injeção |
| `CreateRemoteThread` | Executar em outro processo |
| `SetWindowsHookEx` | Interceptação de entrada |
| `LoadLibrary` / `GetProcAddress` / `dlsym` | Resolução dinâmica — esconde importações |
| `socket` + `connect` + `send` | Comunicação de rede |
| `CryptEncrypt` / `EVP_EncryptInit` | Cifra — ransomware, exfiltração |
| `FindFirstFile` / `readdir` em massa | Varredura de disco |
| `RegOpenKeyEx` / `regedit` | Persistência (Windows) |
| `system` / `execve` / `popen` | Execução de comando |
| `unlink` / `DeleteFile` em lote | Destruição, ou anti-forense |

**A combinação é o sinal, não a função isolada.** `socket` sozinho é qualquer programa de rede.
`socket` + varredura de disco + cifra + exclusão é ransomware.

### Strings: o que procurar

```bash
strings -n 6 binario | grep -iE \
  'http|https|ftp|\.onion|/etc/|/tmp/|passwd|shadow|cron|systemd|rc\.local|bash|sh -c|base64'
```

| Categoria | Exemplos |
|---|---|
| C2 / exfiltração | URLs, domínios, IPs, User-Agents customizados |
| Persistência | `/etc/cron.d/`, `~/.bashrc`, `systemd/`, `rc.local` |
| Coleta | `/etc/passwd`, `~/.ssh/`, `id_rsa`, wallets |
| Execução | `sh -c`, `curl`, `wget`, `chmod +x`, `base64 -d` |
| Anti-análise | `ptrace`, `TracerPid`, `/proc/self/status` |
| Esconderijo | `/tmp/.X11-unix`, `/dev/shm`, nomes começando com `.` |

**`/dev/shm` e `/tmp` são os esconderijos clássicos** — graváveis por qualquer usuário e
frequentemente ignorados por higienização de sistema.

---

## 7.4 O que é ofuscação legítima

Nem toda ofuscação é maliciosa:

| Técnica | Uso legítimo |
|---|---|
| Ofuscação de strings | Programas com licenciamento, DRM, anti-tamper |
| Anti-debug | Jogos (anti-cheat), software comercial (anti-crack) |
| Packing | Redução de tamanho, proteção de IP |
| VM detection | Software que se comporta diferente em VM por razões legítimas |

**A técnica não determina se o software é malicioso.** O que determina é o **comportamento**:
o que ele faz com o sistema, com os dados, com a rede, e com quem o executa.

Um binário pode usar anti-debug legítimo e ser benigno. Um binário sem nenhuma ofuscação pode
ser ransomware. Julgar pela técnica é erro de principiante.

---

## 7.5 LAB — Triagem estática de amostra didática

**Duração:** 75 min
**Objetivo:** praticar o reconhecimento sem executar nada.

### Passo 1 — As amostras didáticas

Estas amostras são programas que **você compila e lê** — comportamento conhecido, risco zero.
Elas imitam técnicas de forma inofensiva.

```bash
mkdir -p ~/re-lab/lab7 && cd ~/re-lab/lab7

# --- Amostra A: strings ofuscadas com XOR ---
cat > amostra-a.c <<'EOF'
#include <stdio.h>

/* Bytes de uma string "cifrada" com XOR 0x42 — imita ofuscação de string */
unsigned char cifrado[] = {
    0x21, 0x27, 0x2f, 0x2f, 0x2f, 0x70, 0x36, 0x33, 0x60, 0x31, 0x70, 0x25,
    0x2c, 0x26, 0x37, 0x0a, 0x70, 0x64, 0x70, 0x25, 0x36, 0x2d, 0x36, 0x27,
    0x33, 0x34, 0x70, 0x21, 0x6f, 0x22, 0x30, 0x36
};

int main(void) {
    size_t i;
    for (i = 0; i < sizeof(cifrado); i++)
        cifrado[i] ^= 0x42;
    printf("%s\n", cifrado);
    return 0;
}
EOF

# --- Amostra B: detecção de tracer (inofensiva — só checa) ---
cat > amostra-b.c <<'EOF'
#include <stdio.h>
#include <string.h>

/* Lê /proc/self/status e reporta TracerPid — imita anti-debug */
int main(void) {
    FILE *f = fopen("/proc/self/status", "r");
    char linha[256];
    int tracer = 0;

    if (!f) return 1;
    while (fgets(linha, sizeof(linha), f)) {
        if (strncmp(linha, "TracerPid:", 10) == 0) {
            sscanf(linha + 10, "%d", &tracer);
            break;
        }
    }
    fclose(f);

    printf("tracer=%d\n", tracer);
    return tracer == 0 ? 0 : 1;
}
EOF

# --- Amostra C: imports "suspeitos" para análise ---
cat > amostra-c.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

/* Imita reconhecimento de ambiente — apenas lista, não faz nada com os dados */
int main(void) {
    const char *alvos[] = {
        "/etc/passwd", "/etc/hostname", "/proc/self/status", "/dev/shm",
        "/tmp/.cache-teste", NULL
    };
    int i;

    for (i = 0; alvos[i]; i++) {
        if (access(alvos[i], R_OK) == 0)
            printf("acessivel: %s\n", alvos[i]);
    }

    char buf[256];
    if (gethostname(buf, sizeof(buf)) == 0)
        printf("host: %s\n", buf);

    return 0;
}
EOF

for n in a b c; do
    gcc -O1 -o "amostra-$n" "amostra-$n.c"
    strip "amostra-$n"
done
```

⚠ **Estas amostras são inofensivas**, mas trate-as como se fossem hostis para praticar o
procedimento. É assim que você constrói o hábito.

### Passo 2 — Triagem de cada amostra (sem executar)

Produza `triagem-malware.md` com, para cada amostra:

```bash
file amostra-X
readelf -h amostra-X | grep -E 'Type|Entry'
readelf -S amostra-X | grep -E '\.text|\.rodata|\.data'
strings -n 5 -t x amostra-X | head -40
objdump -d -j .plt -M intel amostra-X
```

Responda para cada uma:

1. Está empacotada? Que evidência você usou?
2. Quais funções de libc importa? O que a lista sugere?
3. Quais strings legíveis aparecem? Alguma chama atenção?
4. Há sinal de anti-análise?

### Passo 3 — Decifre a string da Amostra A (estaticamente)

Extraia os bytes do binário e decifre sem executar o programa:

```bash
# Localize a região de dados cifrados
objdump -s -j .data amostra-a | head -20

# Ou extraia com python a partir do offset
python3 - <<'EOF'
cifrado = bytes([
    0x21, 0x27, 0x2f, 0x2f, 0x2f, 0x70, 0x36, 0x33, 0x60, 0x31, 0x70, 0x25,
    0x2c, 0x26, 0x37, 0x0a, 0x70, 0x64, 0x70, 0x25, 0x36, 0x2d, 0x36, 0x27,
    0x33, 0x34, 0x70, 0x21, 0x6f, 0x22, 0x30, 0x36
])
print("chave 0x42:", bytes(b ^ 0x42 for b in cifrado).decode())
for k in range(256):
    txt = bytes(b ^ k for b in cifrado)
    if all(32 <= c < 127 or c == 10 for c in txt):
        print(f"chave 0x{k:02x}: {txt.decode(errors='replace')}")
EOF
```

**Este é o procedimento real de descriptografia estática de strings.** Você replica o loop de
decifração em Python, sem executar o programa. Isole a string final.

### Passo 4 — Analise o loop no disassembly

```bash
objdump -d -M intel amostra-a | sed -n '/<main>:/,/^$/p'
```

Encontre o loop de XOR e identifique:

- A chave (`0x42`) — em que instrução aparece?
- O tamanho do buffer — como o compilador calculou `sizeof(cifrado)`?
- O contador — em qual registrador?
- Quantas iterações?

Isso conecta diretamente ao Módulo 6: você está aplicando o método em contexto de triagem.

### Passo 5 — Correlacione Amostra B e C

**Amostra B:** o binário abre `/proc/self/status`. Prove isso **sem executá-lo**:

```bash
strings -n 8 amostra-b | grep proc
objdump -d -j .plt -M intel amostra-b
# fclose, fgets, fopen → leitura de arquivo
# Qual função faz a comparação com "TracerPid"?
```

**Amostra C:** liste todas as funções de libc e explique o que cada uma revela:

```bash
objdump -d -j .plt -M intel amostra-c | grep -oP '<\K[^>]+'
```

Para cada importação, escreva uma frase: "esta função indica que o programa provavelmente ...".

### Passo 6 — Compare com o comportamento real

Agora — só agora — execute as amostras e confirme suas hipóteses:

```bash
./amostra-a
./amostra-b
./amostra-c
```

Responda: **sua análise estática previu o comportamento corretamente?** Onde errou, e por quê?

Se quiser ver o anti-debug reagindo:

```bash
gdb -q ./amostra-b
(gdb) run
# TracerPid será não-zero porque o GDB é o tracer
```

⚠ Isso é inofensivo aqui. Em malware real, essa técnica significa que o comportamento muda sob
depurador — e é uma das razões pelas quais análise dinâmica ingênua engana.

### Critérios de aceitação

- `triagem-malware.md` cobre as três amostras com evidência de cada conclusão.
- Você decifrou a string da Amostra A **sem executar o binário**.
- Você identificou a chave XOR e o loop no disassembly.
- Você previu o comportamento da Amostra B a partir de `strings` + `.plt` antes de rodar.
- Você escreveu uma frase de inferência para cada importação da Amostra C.
- Você documentou pelo menos uma hipótese que estava errada.

---

## Avaliação

1. Liste cinco sinais de que um binário está empacotado. Como você mede entropia de uma seção?
2. O que é o stub de um packer e por que o código visível no arquivo não é o código executado?
3. Como o desempacotamento dinâmico funciona? Por que ele exige executar o binário?
4. Descreva três técnicas de detecção de depurador e como cada uma aparece em análise estática.
5. O que é control flow flattening? Por que ele dificulta a leitura de uma função?
6. O que é um opaque predicate? Como você o identifica?
7. Um binário tem strings ilegíveis. Como você determina se estão cifradas ou apenas comprimidas,
   e como você as decifra estaticamente?
8. `socket` sozinho é sinal de malware? Dê um exemplo de combinação de importações que **é**
   sinal forte, e explique por quê.
9. Por que `/dev/shm` e `/tmp` são esconderijos comuns?
10. Por que julgar um software pela presença de ofuscação é erro? O que determina se ele é
    malicioso?

---

**Próximo:** [Módulo 8 — Patch diffing e automação](modulo-08.md)
