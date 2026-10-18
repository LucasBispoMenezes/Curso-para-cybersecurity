# Módulo 2 — Ambiente e Proveniência do Build

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulo 1

---

## Objetivos

1. Montar o **ambiente completo** de patch diffing, funcionando.
2. Medir a **proveniência** de um par — e decidir se ele é diffável.
3. Reconhecer o **build não determinístico** e o que fazer com ele.
4. Encontrar os **pares oficiais** de um fornecedor, sistematicamente.
5. Preparar o par para o diff — **símbolos, versão, e documentação da origem**.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O diff é tão bom quanto a proveniência do par.** **Com build ruim, você gasta horas lendo ruído
> e concluindo nada.**

⚠ **E a frase do material profissional, porque ela é o resumo do módulo:**

> *"Compiler/build differences can create enormous noise, so exact build provenance matters."*

⚠ **A consequência prática, e ela é dura:** **um par mal escolhido não é "diff com mais trabalho" —
é diff inútil.** **Você vai ver 400 funções mudadas, 399 são de build, e você não tem como saber
qual é a 1.**

⚠ **A tese:**

> **Antes de diffar, você PROVA que o par é diffável.** **E a prova tem quatro passos, todos
> verificáveis.**

⚠ **E a razão de isso ser um módulo inteiro:** **a maioria dos iniciantes trava aqui, sem saber que
travou.** **Eles acham que o problema é a ferramenta, ou a habilidade — e é a proveniência.**

---

## 2.1 Os quatro testes de proveniência

⚠ **Antes de qualquer diff, quatro verificações. Se uma falha, você muda de par.**

| # | Teste | O que verifica | Como |
|---|---|---|---|
| 1 | **Mesma arquitetura** | bits, endianness, ABI | `readelf -h` |
| 2 | **Mesmo compilador** | versão e vendor | `strings \| grep GCC` |
| 3 | **Mesma build** | pipeline, flags | Build ID, tamanho, símbolos |
| 4 | ⚠ **Determinismo** | o build é reproduzível? | compilar 2× e comparar |

⚠ **O teste 4 é o que ninguém faz — e o que decide tudo.** **Se o build não é determinístico,
duas compilações da MESMA versão diferem** — **e o diff contra o binário oficial será ruído.**

⚠ **A tabela do que cada resultado significa:**

| Resultado | Significa | Ação |
|---|---|---|
| Arquitetura difere | ⚠ Par inválido | Mudar de par |
| Compilador difere | ⚠ Ruído garantido | Achar builds do mesmo pipeline |
| Build difere muito | Ruído alto | Filtrar por fluxo (§5) |
| **Não determinístico** | ⚠⚠ **Diff inviável** | Usar binários **oficiais** |

⚠ **A última linha é a que resolve.** **Se o seu compilador não é determinístico, você não pode
recompilar** — **você usa o que o fornecedor publicou**, **porque vem do mesmo pipeline.**

⚠ **E é exatamente o que o `DiffRays` faz:** ele **baixa os binários oficiais publicados** — **não
recompila.** **É a razão de a automação dele ser confiável, e a sua recompilação não ser.**

```bash
mkdir -p ~/patch-lab/mod02 && cd ~/patch-lab/mod02

echo "═══ 1. os quatro testes ═══"
echo
cat > testa-par.sh <<'SCRIPT'
#!/usr/bin/env bash
# testa-par.sh — os quatro testes de proveniência
set -uo pipefail

A="${1:?uso: testa-par.sh <A> <B>}"
B="${2:?informe o segundo binário}"

echo "═══════════ TESTE DE PAR ═══════════"
echo

info() {
    local f="$1"
    echo "  ── $(basename "$f") ──"
    file "$f" 2>/dev/null | sed 's/^/     /'
    printf '     tamanho    : %s\n' "$(stat -c %s "$f" 2>/dev/null)"
    printf '     arquitetura: %s\n' "$(readelf -hW "$f" 2>/dev/null | grep Machine | sed 's/.*: *//')"
    printf '     tipo       : %s\n' "$(readelf -hW "$f" 2>/dev/null | grep Type | sed 's/.*: *//')"
    cc=$(strings "$f" 2>/dev/null | grep -oE 'GCC: \([^)]*\) [0-9.]+' | head -1)
    printf '     compilador : %s\n' "${cc:-não identificado}"
    bid=$(readelf -nW "$f" 2>/dev/null | grep -i 'Build ID' | awk '{print $NF}')
    printf '     build id   : %s\n' "${bid:- —}"
    printf '     nº funções : %s\n' "$(nm -D "$f" 2>/dev/null | wc -l)"
    echo
}

echo "── TESTE 1 e 2: arquitetura e compilador ──"
info "$A"
info "$B"

ma=$(readelf -hW "$A" 2>/dev/null | grep Machine | sed 's/.*: *//')
mb=$(readelf -hW "$B" 2>/dev/null | grep Machine | sed 's/.*: *//')
[ "$ma" = "$mb" ] && echo "  ✓ TESTE 1: mesma arquitetura" || echo "  ⚠⚠ TESTE 1 FALHOU: arquitetura difere"

cca=$(strings "$A" 2>/dev/null | grep -oE 'GCC: \([^)]*\) [0-9.]+' | head -1)
ccb=$(strings "$B" 2>/dev/null | grep -oE 'GCC: \([^)]*\) [0-9.]+' | head -1)
if [ -n "$cca" ] && [ "$cca" = "$ccb" ]; then
    echo "  ✓ TESTE 2: mesmo compilador"
elif [ -z "$cca" ] || [ -z "$ccb" ]; then
    echo "  ·  TESTE 2: compilador não identificado (pode ser strip)"
else
    echo "  ⚠ TESTE 2: compiladores diferentes — ruído esperado"
fi
echo

echo "── TESTE 3: build ──"
printf '  diferença de tamanho: %s bytes\n' "$(( $(stat -c %s "$A") - $(stat -c %s "$B") ))"
printf '  diferença de símbolos: %s\n' "$(( $(nm -D "$A" 2>/dev/null | wc -l) - $(nm -D "$B" 2>/dev/null | wc -l) ))"
echo

echo "── TESTE 4: determinismo (⚠ o decisivo) ──"
cat <<'EXPL'
  ⚠ para testar: compile o MESMO fonte 2x e compare

     gcc -o b1 fonte.c && sleep 1 && gcc -o b2 fonte.c
     cmp b1 b2

  ✓ iguais  → o compilador é determinístico
     ⚠ diferentes → você NÃO pode recompilar
        → use os binários OFICIAIS do fornecedor
EXPL
echo

echo "── VEREDICTO ──"
cat <<'EXPL'
  1 arquitetura  → [ ] ok  [ ] falhou
  2 compilador   → [ ] ok  [ ] suspeito
  3 build        → [ ] ok  [ ] falhou
  4 determinismo → [ ] ok  [ ] falhou

  ⚠ se qualquer um falhou: MUDE DE PAR.
     não é "mais trabalho" — é diff inútil.
EXPL
SCRIPT

chmod +x testa-par.sh

# demonstra com dois builds do mesmo fonte
cat > alvo.c <<'EOF'
#include <stdio.h>
#include <string.h>

int processa(const char *e, size_t n) {
    char buf[64];
    if (n > sizeof(buf) - 1) return -1;
    memcpy(buf, e, n);
    return (int)strlen(buf);
}
int main(int c, char **v){ if(c<2)return 2; printf("%d\n", processa(v[1], strlen(v[1]))); return 0; }
EOF

gcc -O0 -o b_O0 alvo.c 2>/dev/null
gcc -O2 -o b_O2 alvo.c 2>/dev/null
./testa-par.sh b_O0 b_O2 2>&1 | head -35
```

⚠ **A saída mostra as três primeiras verificações.** **A quarta — o determinismo — você testa
compilando duas vezes o mesmo fonte.**

⚠ **E é a que mais falha.** **Muitos builds inserem timestamp, caminho, ou UUID** — **e duas
compilações idênticas diferem.** **Sem perceber, você diffa um contra o outro e vê "tudo diferente"**
— **e acha que é o patch.**

**Produza `quatro-testes.md`:**

| # | Teste | Resultado no seu par | Ação |
|---|---|---|---|
| 1 | Arquitetura | | |
| 2 | Compilador | | |
| 3 | Build | | |
| 4 | Determinismo | | |

**Responda:**

1. **Qual teste é o que ninguém faz?** Por que ele decide?
2. **O que fazer se o build não for determinístico?**
3. **Por que o `DiffRays` é confiável** e a sua recompilação não é?
4. **O que significa um par com compiladores diferentes?**

---

## 2.2 Determinismo — e como contornar

⚠ **O build não determinístico é mais comum do que parece. E há três causas.**

| Causa | Por que aparece | Contornar |
|---|---|---|
| **Timestamp embutido** | `__DATE__`, `__TIME__` | ⚠ Não dá — mude de par |
| **Caminho absoluto** | debug info, `__FILE__` | ⚠ Idem |
| **UUID / ordem de link** | paralelismo, hash | ⚠ Idem |
| Build ID diferente | ⚠ Normal, e **não impede** | Ignorar — é esperado |

⚠ **A última linha é a que confunde.** **O Build ID **sempre** difere entre versões** — **é o
objetivo dele.** **E ele não impede o diff**, porque **é só um hash no cabeçalho.**

⚠ **A distinção, escrita:**

> **Build ID diferente entre VERSÕES distintas é esperado. Build ID diferente entre builds IDÊNTICOS
> é sinal de não determinismo.**

⚠ **E a tabela do que fazer em cada caso:**

| Situação | Diffável? | O que fazer |
|---|---|---|
| Mesmo fonte, 2 builds, **iguais** | ✓ | Ótimo — recompile à vontade |
| Mesmo fonte, 2 builds, **diferem só no Build ID** | ✓ | Ótimo — ignora o ID |
| Mesmo fonte, 2 builds, **muitas diferenças** | ⚠ | Use **binário oficial** |
| Builds oficiais do fornecedor | ✓✓ | ⚠ **O melhor caminho** |
| Você recompilou o fonte, tem o oficial | ⚠ | **Compare com o oficial**, não o seu |

⚠ **A última linha é o erro clássico.** **Você tem o binário oficial e resolve recompilar "para
comparar"** — **e o diff do seu build contra o oficial é ruído.** **Você diffa **oficial N-1** contra
**oficial N**, e nada mais.**

⚠ **É o mesmo princípio do módulo 2 do curso de Exploit:** **você mede, não supõe.** **Aqui você
verifica a proveniência antes de diffar** — porque **o resultado do diff depende dela.**

```bash
cd ~/patch-lab/mod02

echo "═══ 2. o teste do determinismo, na prática ═══"
echo
cat > testa-determinismo.sh <<'SCRIPT'
#!/usr/bin/env bash
# testa-determinismo.sh — verifica se o build é reproduzível
set -uo pipefail

FONTE="${1:?uso: testa-determinismo.sh <fonte.c>}"
CC="${CC:-gcc}"

echo "═══════════ TESTE DE DETERMINISMO ═══════════"
echo "  fonte: ${FONTE}"
echo "  compilador: $($CC --version 2>/dev/null | head -1)"
echo

$CC -o /tmp/det_a "$FONTE" 2>/dev/null || { echo "⚠ falha na compilação"; exit 1; }
sleep 1
$CC -o /tmp/det_b "$FONTE" 2>/dev/null

sa=$(stat -c %s /tmp/det_a); sb=$(stat -c %s /tmp/det_b)
printf '  tamanho A: %s\n  tamanho B: %s\n' "$sa" "$sb"

ida=$(readelf -nW /tmp/det_a 2>/dev/null | grep -i 'Build ID' | awk '{print $NF}')
idb=$(readelf -nW /tmp/det_b 2>/dev/null | grep -i 'Build ID' | awk '{print $NF}')
printf '  build id A: %s\n  build id B: %s\n' "${ida:——}" "${idb:——}"
echo

if cmp -s /tmp/det_a /tmp/det_b; then
    echo "  ✓✓ IDÊNTICOS — build TOTALMENTE determinístico"
    echo "     → você pode recompilar com confiança"
elif [ "$ida" != "$idb" ] && [ "$sa" = "$sb" ]; then
    n=$(cmp -l /tmp/det_a /tmp/det_b 2>/dev/null | wc -l)
    echo "  ✓ determinístico EXCETO o Build ID"
    printf '     bytes diferentes: %s (só o hash)\n' "$n"
    echo "     → ⚠ diffável, ignorando o cabeçalho do Build ID"
else
    n=$(cmp -l /tmp/det_a /tmp/det_b 2>/dev/null | wc -l)
    echo "  ⚠⚠ DIFEREM em ${n} bytes"
    echo "     → o build NÃO é determinístico"
    echo "     → ⚠ NÃO recompile: use os binários OFICIAIS"
    echo
    echo "     ── as diferenças (primeiras 5) ──"
    cmp -l /tmp/det_a /tmp/det_b 2>/dev/null | head -5 | sed 's/^/       /'
fi
echo

echo "── O QUE ISSO DECIDE ──"
cat <<'EXPL'
  ✓ determinístico      → recompilar é válido
  ✓ exceto Build ID     → diffável, ignore o ID
  ⚠⚠ não determinístico  → use o binário OFICIAL do fornecedor
                          (que é o que o DiffRays faz)
EXPL
SCRIPT

chmod +x testa-determinismo.sh
./testa-determinismo.sh alvo.c

echo
echo "═══ 3. o erro clássico ═══"
echo
cat <<'EXPL'
  ── O ERRO ──
     você tem:
       · binário oficial N-1
       · binário oficial N
       ⚠ e resolve recompilar o FONTE N-1 "para comparar"

     → o seu build N-1 difere do OFICIAL N-1
       (flags, versão de compilador, ordem)
     → ⚠ o diff do seu contra o oficial é RUÍDO

  ── O CERTO ──
     · diff OFICIAL N-1  ×  OFICIAL N
     · e o fonte serve só para VOCÊ CONFERIR a leitura

  ✓ é o mesmo princípio do curso de Exploit:
     você MEDE a proveniência, não a supõe.
EXPL
```

⚠ **O script distingue os três casos — e o segundo é o mais comum.** **Build determinístico exceto
o Build ID** é o caso típico — **e é diffável**, porque a diferença é **um hash no cabeçalho**.

⚠ **E o terceiro caso é o que destrói o diff.** **Centenas de bytes diferentes** significa que **o
build é não determinístico** — **e recompilar não serve.** **Você usa o oficial.**

**Produza `determinismo.md`:**

| Caso | Resultado no seu | Diffável? |
|---|---|---|
| Determinístico | | |
| Exceto Build ID | | |
| Não determinístico | | |

**Responda:**

1. **Qual é o caso mais comum?** Por que ainda é diffável?
2. **O que fazer no terceiro caso?**
3. **Por que Build ID diferente entre versões é esperado?**
4. **Qual é o erro clássico** de quem tem o binário oficial?

---

## 2.3 Encontrando os pares

⚠ **O catálogo das fontes. E ele é sistemático.**

| Fonte | O que dá | Ritmo |
|---|---|---|
| **Microsoft Patch Tuesday** | ⚠ **O mais sistemático** | Mensal |
| **GitHub Releases** | binário de cada versão | Por release |
| **Repositório da distro** | pacote N-1 e N | Contínuo |
| **security tracker** (Red Hat, Debian, Ubuntu) | CVE + versão corrigida | Contínuo |
| **DiffRays AutoDiff** | baixa por CVE | ⚠ Automático |
| Site do fornecedor | downloads antigos | Irregular |

⚠ **A linha do Patch Tuesday merece a explicação.** **A Microsoft publica atualizações mensais,
sistematicamente, para muitos produtos.** **E cada uma é um par N-1 × N** — **com CVE associado.**
**É a razão de o material profissional começar por Windows.**

⚠ **A tabela do que procurar, por sistema:**

| Sistema | Onde | Comando / URL |
|---|---|---|
| **Windows** | Windows Update Catalog | search "KB" |
| **Linux (pacote)** | `apt`/`dnf` archives | `snapshot.debian.org` |
| **Projeto aberto** | GitHub Releases | `releases/` |
| **npm / PyPI** | registro | versões antigas |
| **Docker** | tags antigas | `image:tag` |

⚠ **A linha do `snapshot.debian.org` é a mais útil para Linux.** **É um arquivo histórico de
TODOS os pacotes Debian, com data** — **e você consegue baixar exatamente o N-1 e o N.** **É o
Patch Tuesday do Linux, e quase ninguém usa.**

⚠ **E a linha do Docker é a mais prática para reproduzir.** **Baixar `imagem:versao-antiga` dá o
binário exato** — **com a proveniência do pipeline oficial.** **Você não recompila: você baixa a
imagem que o fornecedor publicou.**

```bash
cd ~/patch-lab/mod02

echo "═══ 4. encontrando pares ═══"
echo
cat > fontes-de-par.md <<'EOF'
# Fontes de pares

## Por sistema
| Sistema | Fonte | Como |
|---|---|---|
| Windows | Windows Update Catalog | buscar o KB |
| Windows | Microsoft Patch Tuesday | a lista mensal |
| Debian | snapshot.debian.org | ⚠ arquivo histórico com data |
| Ubuntu | launchpad / security tracker | versões antigas |
| Fedora/RHEL | koji / dnf archives | |
| Projeto aberto | GitHub Releases | o binário de cada tag |
| npm/PyPI | o registro | versões antigas |
| Docker | tags antigas da imagem | ⚠ o mais prático |

## ⚠ O snapshot do Debian
```
https://snapshot.debian.org/package/<pacote>/
```
✓ TODAS as versões, com data
✓ é o "Patch Tuesday" do Linux
✓ e quase ninguém usa

## ⚠ O Docker
```
docker pull <imagem>:<versao-antiga>
docker create --name old <imagem>:<versao-antiga>
docker cp old:/caminho/binario ./binario-N-1
```
✓ baixa o binário do PIPELINE OFICIAL
✓ você não recompila nada

## O DiffRays (automático)
```
python diffrays.py autodiff --cve CVE-XXXX-YYYY
```
✓ identifica o componente
✓ baixa os DOIS binários OFICIAIS
✓ roda o diff
⚠ entenda o processo antes de confiar na saída
EOF

cat fontes-de-par.md

echo
echo "═══ 5. baixando um par real — o método ═══"
echo
cat <<'EXPL'
  ── PASSO 1: identificar a versão corrigida ──
     · o advisory diz "corrigido em X.Y.Z"
     · ou o tracker da distro diz qual versão tem o patch
     · ou o commit tem uma tag

  ── PASSO 2: identificar a N-1 ──
     ⚠ a versão IMEDIATAMENTE anterior
        · não a mais antiga
        · não a "última antes do lançamento"
     ✓ e quanto menor a distância, menor o ruído

  ── PASSO 3: baixar os DOIS ──
     ✓ do mesmo fornecedor
     ✓ do mesmo pipeline
     ⚠ NÃO de um build seu

  ── PASSO 4: testar a proveniência (este módulo) ──
     arquitetura · compilador · build · determinismo

  ── PASSO 5: registrar ──
     URL de cada um, data do download, hash
     ⚠ é o que o módulo 8 do Pesquisa exige
EXPL

echo
echo "═══ 6. o registro do par ═══"
cat > registra-par.md <<'EOF'
# Registro do par

## Identificação
| Item | Valor |
|---|---|
| Projeto | |
| CVE | |
| CWE | |

## Versão N-1 (vulnerável)
| Campo | Valor |
|---|---|
| Versão | |
| URL de origem | |
| Data do download | |
| SHA-256 | |
| Arquitetura | |
| Compilador | |
| Build ID | |

## Versão N (corrigida)
| Campo | Valor |
|---|---|
| Versão | |
| URL de origem | |
| Data do download | |
| SHA-256 | |
| Arquitetura | |
| Compilador | |
| Build ID | |

## Testes
| # | Teste | Resultado |
|---|---|---|
| 1 | arquitetura | |
| 2 | compilador | |
| 3 | build | |
| 4 | determinismo | |

## Veredito
[ ] par diffável
[ ] par com ruído — filtrar por fluxo (módulo 5)
[ ] ⚠ par inválido — mudar
EOF

cat registra-par.md
echo
echo "  ⚠ o hash SHA-256 é o que prova que você usou ESTE binário."
echo "     sem ele, o registro não reproduz."
```

⚠ **O registro com URL, data e **hash** é o que torna o diff reproduzível.** **É o módulo 8 do curso
de Pesquisa aplicado ao binário:** **sem o hash, você não prova qual binário analisou.**

⚠ **E a regra do "N-1 imediatamente anterior" é econômica.** **Quanto menor a distância entre as
versões, menor o ruído** — **porque menos código mudou além do patch.**

**Produza `fontes.md`:**

| Sistema | Fonte | Como |
|---|---|---|
| Windows | | |
| Debian | | |
| Projeto aberto | | |
| Docker | | |

**Responda:**

1. **Qual fonte é a mais sistemática?**
2. **O que o `snapshot.debian.org` dá** que quase ninguém usa?
3. **Por que usar Docker** é prático?
4. **Por que registrar o hash?**

---

## 2.4 LAB — Ambiente completo, com um par verificado

**Duração:** 120 min

### Passo 1 — Instale e verifique o ambiente (35 min)

```bash
cd ~/patch-lab

cat > instala-tudo.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail

echo "═══ AMBIENTE DE PATCH DIFFING ═══"
echo

echo "── 1. ESSENCIAIS ──"
sudo apt update -qq 2>/dev/null
sudo apt install -y gcc gdb git curl jq file binutils python3-pip 2>&1 | tail -2
echo

echo "── 2. PYTHON ──"
pip3 install --quiet pwntools ropper capstone 2>&1 | tail -1
printf '  %-14s ' "pwntools:"; python3 -c "import pwn;print(pwn.__version__)" 2>/dev/null || echo "⚠"
printf '  %-14s ' "ropper:"; ropper --version 2>/dev/null | head -1 || echo "⚠"
printf '  %-14s ' "capstone:"; python3 -c "import capstone;print(capstone.__version__)" 2>/dev/null || echo "⚠"
echo

echo "── 3. GHIDRA ──"
if command -v ghidra >/dev/null 2>&1 || ls -d /opt/ghidra* 2>/dev/null >/dev/null; then
    echo "  ✓ encontrada"
else
    cat <<'EXPL'
  ⚠ ausente — baixe manualmente:
     1. https://ghidra-sre.org/
     2. descompacte em /opt/ghidra
     3. ./ghidraRun
     ⚠ requer Java 17+:
        sudo apt install -y openjdk-17-jdk
EXPL
fi
echo

echo "── 4. FERRAMENTAS OPCIONAIS ──"
for t in "DiffRays:https://github.com/pwnfuzz/diffrays" \
         "Ghidriff:https://github.com/clearbluejar/ghidriff" \
         "Diaphora:https://github.com/joxeankoret/diaphora"; do
    nome="${t%%:*}"; url="${t##*:}"
    printf '  %-12s %s\n' "$nome" "$url"
done
echo

echo "── 5. VERIFICAÇÃO ──"
cat <<'EXPL'
  | Ferramenta | Comando de verificação |
  |---|---|
  | Ghidra | `ghidraRun` ou `/opt/ghidra/ghidraRun` |
  | BinDiff | precisa do IDA ou Ghidra plugin |
  | DiffRays | `python3 diffrays.py --help` |
  | pwntools | `python3 -c "import pwn"` |

  ⚠ comece pelo GHIDRA MANUAL. as outras automatizam.
EXPL
SCRIPT

chmod +x instala-tudo.sh
bash instala-tudo.sh 2>&1 | head -40
```

Produza `ambiente.md`:

| Ferramenta | Presente? | Versão | O que falta |
|---|---|---|---|
| `gcc` | | | |
| Ghidra | | | |
| `pwntools` | | | |
| `ropper` | | | |
| `capstone` | | | |
| Java | | | |

**Responda:**

1. **O que falta instalar?** Instale.
2. **Qual ferramenta você começa usando?** Por quê?
3. **O Ghidra requer o quê** além dele?
4. **Quais ferramentas são opcionais?**

### Passo 2 — Verifique um par real (50 min)

⚠ **Escolha um par do seu sistema, ou da distro, e verifique os quatro testes.**

```bash
cd ~/patch-lab/alvos

echo "═══ OBTENDO UM PAR ── opção prática: o snapshot do Debian ═══"
echo
cat <<'EXPL'
  ── se você usa Debian/Ubuntu ──
     1. escolha um pacote pequeno que você conheça
        ex.: jq, file, less, nano, xxd
     2. descubra a versão atual:  dpkg -l <pacote>
     3. baixe a ANTERIOR do snapshot:
        https://snapshot.debian.org/package/<pacote>/

     ⚠ e baixe o .deb — depois extraia:
        ar x pacote.deb && tar xf data.tar.*
        ✓ o binário está em ./usr/bin/
EXPL

echo
echo "═══ OU use um par compilado localmente (para treinar) ═══"
echo

mkdir -p treino && cd treino

cat > versao_antiga.c <<'EOF'
/*
 * ⚠ VERSÃO "VULNERÁVEL" — para treinar o diff.
 *   Tem a validação AUSENTE.
 */
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdlib.h>

typedef struct {
    uint16_t count;
    uint32_t total;
} Cabecalho;

int parse_item(const uint8_t *buf, size_t len) {
    char     dst[64];
    Cabecalho c;

    if (len < sizeof(Cabecalho)) return -1;
    memcpy(&c, buf, sizeof(c));

    c.total = (uint32_t)c.count * 4;      /* ⚠ SEM validação de faixa */

    memcpy(dst, buf + sizeof(c), c.total); /* ⚠ SEM verificação de limite */
    return (int)c.total;
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;
    uint8_t b[4096] = {0};
    memcpy(b, argv[1], strlen(argv[1]));
    printf("r=%d\n", parse_item(b, sizeof(b)));
    return 0;
}
EOF

cat > versao_nova.c <<'EOF'
/*
 * ✓ VERSÃO "CORRIGIDA" — o patch adicionou DUAS verificações.
 */
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdlib.h>

typedef struct {
    uint16_t count;
    uint32_t total;
} Cabecalho;

#define MAX_ITEMS 1024

int parse_item(const uint8_t *buf, size_t len) {
    char     dst[64];
    Cabecalho c;

    if (len < sizeof(Cabecalho)) return -1;
    memcpy(&c, buf, sizeof(c));

    if (c.count > MAX_ITEMS) return -2;       /* ✓ ADICIONADO */
    c.total = (uint32_t)c.count * 4;

    if (c.total > sizeof(dst)) return -3;     /* ✓ ADICIONADO */
    memcpy(dst, buf + sizeof(c), c.total);
    return (int)c.total;
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;
    uint8_t b[4096] = {0};
    memcpy(b, argv[1], strlen(argv[1]));
    printf("r=%d\n", parse_item(b, sizeof(b)));
    return 0;
}
EOF

echo "  ── compilando as duas versões ──"
gcc -O0 -o verso_antigo versao_antiga.c 2>/dev/null && echo "     ✓ verso_antigo"
gcc -O0 -o verso_novo   versao_nova.c   2>/dev/null && echo "     ✓ verso_novo"
echo

echo "  ⚠ as duas foram compiladas com A MESMA flag (-O0)"
echo "     ✓ é a proveniência correta: só o CÓDIGO difere"
echo

../testa-par.sh verso_antigo verso_novo 2>/dev/null | head -30

echo
echo "═══ O DIFF DE FONTE ═══"
diff -u versao_antiga.c versao_nova.c | sed 's/^/  /'
```

Produza `par-verificado.md`:

| Teste | Resultado |
|---|---|
| Arquitetura | |
| Compilador | |
| Build | |
| Determinismo | |
| **Veredito** | |

**Responda:**

1. **Os quatro testes passaram?**
2. **Quantas linhas o diff de fonte tem?**
3. **Quantas verificações o patch adicionou?** Quais?
4. **Qual é o invariante** que o patch garante?

### Passo 3 — Prepare o par para o diff (35 min)

⚠ **O par está verificado. Agora, prepare-o para o Ghidra.**

```bash
cd ~/patch-lab/alvos/treino

echo "═══ PREPARANDO O PAR PARA O DIFF ═══"
echo
cat <<'EXPL'
  ── ANTES DE ABRIR NO GHIDRA ──

     1. ✓ guarde os DOIS binários numa pasta com nome claro
     2. ✓ registre a proveniência (registra-par.md)
     3. ⚠ remova informações que confundem:
        · se tiver símbolos, MELHOR — o diff fica mais fácil
        · se estiver strip, piora — mas ainda funciona
     4. ⚠ e NÃO altere os binários (não renomeie, não edite)

  ── O QUE O GHIDRA VAI FAZER ──
     · carregar os dois
     · analisar automaticamente
     · casar as funções (correlators)
     · ⚠ e a qualidade do casamento depende da proveniência
EXPL

echo
echo "═══ ESTRUTURA DO PAR ═══"
mkdir -p ../CVE-TREINO-0001/{N-1,N}
cp verso_antigo ../CVE-TREINO-0001/N-1/binario
cp verso_novo   ../CVE-TREINO-0001/N/binario

cat > ../CVE-TREINO-0001/NOTAS.md <<'EOF'
# CVE-TREINO-0001 — par de treino

## Origem
| Item | Valor |
|---|---|
| Projeto | alvo didático (compilado por mim) |
| CVE | N/A — exercício |
| N-1 | versao_antiga.c |
| N | versao_nova.c |

## Proveniência
| Item | Valor |
|---|---|
| Compilador | mesmo gcc |
| Flags | -O0 nos dois |
| Diferença | ⚠ SÓ o código |

## O patch
| # | Verificação adicionada | O que garante |
|---|---|---|
| 1 | `if (c.count > MAX_ITEMS)` | faixa de `count` |
| 2 | `if (c.total > sizeof(dst))` | limite do destino |

## O invariante
`count` na faixa, e `total` cabe em `dst`

## ⚠ Ordens que importam
a verificação de FAIXA vem antes da MULTIPLICAÇÃO.
é o módulo 9 do curso de C.
EOF

echo "  ✓ estrutura criada:"
find ../CVE-TREINO-0001 -type f | sed 's/^/     /'
echo
cat ../CVE-TREINO-0001/NOTAS.md
```

⚠ **A nota final é a ponte com o curso de C.** **A verificação de faixa vem **antes** da
multiplicação, e a do destino **antes** do `memcpy`.** **Se invertida, a correção não funciona** —
**e é o módulo 5 do curso de C (UB) aplicado aqui.**

⚠ **E a estrutura `N-1/` e `N/` com `NOTAS.md` é o padrão.** **É o que torna o par reproduzível** —
**e é o que o DiffRays organiza automaticamente.**

**Produza `par-preparado.md`:**

| Item | Valor |
|---|---|
| Caminho do par | |
| N-1 | |
| N | |
| Símbolos? | |
| Invariante | |
| Verificações adicionadas | |

**Responda:**

1. **A estrutura está criada?**
2. **As verificações adicionadas são quantas?** Quais?
3. **Por que a ordem das verificações importa?**
4. **O que o `NOTAS.md` registra** que o binário não registra?

### Critérios de aceitação

- `testa-par.sh` rodando nos **dois** binários.
- `quatro-testes.md` com os **quatro** resultados e a ação de cada.
- Você explicou **qual teste ninguém faz** e por que ele decide.
- `testa-determinismo.sh` rodado, com o **caso identificado**.
- `determinismo.md` com os **três** casos e a distinção.
- Você explicou **por que Build ID diferente entre versões é esperado**.
- Você explicou **o erro clássico** de quem tem o binário oficial.
- `fontes.md` com as **quatro** fontes e o como de cada.
- Você explicou **o que o `snapshot.debian.org` dá** que quase ninguém usa.
- `ambiente.md` com as **seis** ferramentas verificadas.
- O par de treino **compilado com a mesma proveniência**.
- `par-verificado.md` com os quatro testes no par de treino.
- Você identificou **quantas verificações o patch adicionou**.
- Você explicou **por que a ordem das verificações importa** (curso de C, módulo 9).
- A estrutura `N-1/` + `N/` + `NOTAS.md` criada.
- `registra-par.md` preenchido com **URL, data e hash**.
- ⚠ **Nenhum alvo de terceiro.** Binários públicos ou compilados por você.

---

## Avaliação

1. **Por que o diff é tão bom quanto a proveniência?**
2. **Cite os quatro testes de proveniência.**
3. **Qual é o decisivo?** Por que ninguém faz?
4. **O que significa compilador diferente** no par?
5. **O que fazer se o build não for determinístico?**
6. **Por que o `DiffRays` é confiável** e a sua recompilação não é?
7. **Cite as três causas de não determinismo.**
8. **Por que Build ID diferente entre versões é esperado?**
9. **E entre builds idênticos?** O que significa?
10. **O que fazer nos três casos de determinismo?**
11. **Qual é o erro clássico** de quem tem o binário oficial?
12. **Por que o Patch Tuesday é o mais sistemático?**
13. **O que o `snapshot.debian.org` dá?**
14. **Por que usar Docker** é prático para obter um par?
15. **Por que a N-1 imediatamente anterior?**
16. **Por que registrar o hash SHA-256?**
17. **O que o `NOTAS.md` registra?**
18. **Por que a ordem das verificações importa** no patch?
19. **O que o Ghidra faz** com o par, e do que depende a qualidade?
20. **O que separa um diff útil de um inútil?**

---

**Próximo:** [Módulo 3 — Diff de fonte](modulo-03.md)
