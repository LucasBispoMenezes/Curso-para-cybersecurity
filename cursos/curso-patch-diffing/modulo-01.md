# Módulo 1 — Por Que o Diff É a Fonte Mais Honesta

**Carga:** 2 horas (1h teoria · 1h lab)
**Pré-requisitos:** Pesquisa em Segurança (módulos 3 e 4)

---

## Objetivos

1. Entender por que **o diff é a fonte de precisão máxima** sobre um bug.
2. Reconhecer os **três cenários** em que você tem acesso ao diff — e o que cada um permite.
3. Saber o que o diff **dá** e o que ele **não dá**.
4. Montar o laboratório de diff.
5. Escolher o **primeiro par de binários** — com critério.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o curso:**

> **A descrição do CVE diz o que o produto sofreu. O diff diz o que o desenvolvedor teve que
> CONSERTAR.** E é isso que reconstrói o bug.

⚠ **A comparação de precisão:**

| Fonte | O que dá | Precisão |
|---|---|---|
| Comunicado de imprensa | "resolvemos uma falha" | ⚠ Nula |
| Advisory | componente, versão, impacto | Média |
| CWE | a **classe** | Alta |
| Writeup de terceiro | a interpretação de alguém | Média-alta |
| **O diff** | ⚠ **o código exato que mudou** | ⚠⚠ **Máxima** |
| O código **antes** do patch | ⚠ **o bug** | Máxima |

⚠ **A tese:** **ler o diff é reconstruir o raciocínio do desenvolvedor.** **Ele viu um problema, e a
correção diz QUAL problema** — **e frequentemente diz mais que o próprio advisory.**

⚠ **E o `EnBinDiff` mediu o retorno:** focando em patch **data-only** (que muda dado, não código),
**reduziu o falso negativo de 11,02% para 1,63%** — **e achou 20 1-days em binários reais.**
**A leitura do patch é método, e o método está medido.**

---

## 1.1 Os três cenários

⚠ **O que você consegue depende do que você tem. E os três são diferentes.**

| # | Cenário | O que você tem | Técnica | Dificuldade |
|---|---|---|---|---|
| 1 | **Fonte aberta** | o commit | `git diff` | ✓ Baixa |
| 2 | **Binário publicado** | N-1 e N | **patch diffing** | ⚠ Média |
| 3 | **Sem binário, sem fonte** | só o advisory | ⚠ **Inferência** | ⚠⚠ Alta |

⚠ **O cenário 2 é o do curso** — e é o que dá trabalho. **Porque a maioria do software comercial
não publica o fonte** — **mas publica o binário.**

⚠ **E a tabela do que cada cenário entrega:**

| Cenário | Dá o invariante? | Dá o código do patch? | Dá a linha exata? |
|---|---|---|---|
| 1 — fonte | ✓ Direto | ✓ | ✓ |
| 2 — binário | ✓ Inferido | ✓ **Localizado** | ⚠ Aproximado |
| 3 — só advisory | ⚠ Inferido do CWE | ✗ | ✗ |

⚠ **A linha do cenário 2 merece atenção.** **"Localizado" significa que você identifica QUAL
função** — **e frequentemente qual bloco.** **Não é a linha de código** — mas **é o suficiente para
reproduzir.**

⚠ **E é o que o `PLocator` faz:** **localiza o código do patch** a partir do patch + duas funções de
referência. **A localização é o objetivo — não a linha exata.**

```bash
mkdir -p ~/patch-lab/{alvos,diffs,ferramentas,caderno} && cd ~/patch-lab

echo "═══ 1. os três cenários ═══"
echo
cat > cenarios.md <<'EOF'
# Os três cenários de acesso ao diff

## 1. FONTE ABERTA
| Item | Valor |
|---|---|
| O que eu tenho | o repositório, o commit |
| Técnica | `git diff HEAD~1..HEAD` |
| Dificuldade | baixa |
| ⚠ Limite | só funciona em projeto aberto |

## 2. BINÁRIO PUBLICADO
| Item | Valor |
|---|---|
| O que eu tenho | N-1 e N, do mesmo fornecedor |
| Técnica | **patch diffing** (Ghidra + BinDiff) |
| Dificuldade | média |
| ✓ Dá o invariante INFERIDO e o código LOCALIZADO |

## 3. SÓ O ADVISORY
| Item | Valor |
|---|---|
| O que eu tenho | componente, versão, CWE |
| Técnica | inferência a partir da classe |
| Dificuldade | alta |
| ⚠ Não dá o código — dá a direção |

## O que o diff dá, e o que não dá
| Dá | Não dá |
|---|---|
| o código exato que mudou | ⚠ a **alcançabilidade** |
| o invariante violado | ⚠ o **impacto real** |
| a classe do bug | ⚠ a **severidade** |
| ⚠ e o padrão, para a variante | ⚠ a **exploração** |
EOF

cat cenarios.md

echo
echo "═══ 2. o que o diff dá — e o que ele não dá ═══"
echo
cat <<'EXPL'
  ── O DIFF DÁ ──
     ✓ o código exato que mudou
     ✓ o invariante violado (módulo 3 do Pesquisa)
     ✓ a classe do bug
     ✓ ⚠ o PADRÃO — e é isso que destrava a variante
     ✓ a localização, para reproduzir

  ── O DIFF NÃO DÁ ──
     ✗ se o caminho é ALCANÇÁVEL em runtime
     ✗ o impacto real (depende do contexto)
     ✗ a severidade (depende do ambiente)
     ✗ ⚠ o exploit — a primitiva exige análise própria
     ✗ se há OUTRO bug no mesmo patch

  ⚠ a linha "se há outro bug" é a que a maioria ignora:
     um patch pode corrigir DOIS problemas, e o advisory
     descreve só um.
     ✓ é por isso que você lê o diff INTEIRO, não só o trecho citado.
EXPL
```

⚠ **A última linha é a que dá achado extra.** **Um patch corrige o que foi reportado** — **e
frequentemente corrige mais, de passagem.** **O advisory descreve um; o diff mostra os dois.**
**É a razão de você ler o diff inteiro.**

⚠ **E é a primeira aparição do tema do módulo 9:** **silent patch é uma correção que não gerou
aviso** — **e um patch com dois consertos é um caso menor do mesmo fenômeno.**

**Produza `cenarios.md`:**

| Cenário | O que dá | Dificuldade |
|---|---|---|
| Fonte aberta | | |
| Binário | | |
| Só advisory | | |

**Responda:**

1. **Qual cenário é o do curso?** Por quê?
2. **O que o diff não dá?** Cite quatro.
3. **Por que ler o diff inteiro** e não só o trecho citado?
4. **O que "código do patch localizado" significa** — linha exata, ou função?

---

## 1.2 Por que a proveniência decide tudo

⚠ **O conceito que separa um diff útil de um diff inútil.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ BOM PAR                                                              │
│   · mesmo fornecedor                                                 │
│   · mesmo compilador (versão e flags)                                │
│   · diferença SÓ no patch                                            │
│   → o diff mostra o patch, e pouco mais                              │
├──────────────────────────────────────────────────────────────────────┤
│ PAR RUIM                                                             │
│   · builds de fontes diferentes                                      │
│   · compiladores diferentes                                          │
│   · flags diferentes (-O2 vs -O0)                                    │
│   → ⚠ o diff mostra 400 funções, e a de segurança é uma               │
└──────────────────────────────────────────────────────────────────────┘
```

⚠ **E a frase que o material profissional repete:** *"Compiler/build differences can create enormous
noise, so exact build provenance matters."* **Não é detalhe — é o pré-requisito.**

⚠ **A tabela do que gera ruído:**

| Fonte de ruído | Efeito |
|---|---|
| Compilador diferente (GCC vs. Clang) | ⚠ Todo o binário difere |
| Versão do compilador | Muitas funções diferem |
| Otimização (`-O0` vs. `-O2`) | ⚠ **Diferença total** |
| Ordem de linkagem | Endereços e seções |
| Flags de segurança (`-fPIE`, `-D_FORTIFY`) | Estrutura |
| Bibliotecas diferentes | Chamadas mudam |
| Build não-determinístico | ⚠ **Diferença em tudo, sem causa** |

⚠ **A última linha é a pior.** **Alguns builds inserem timestamp ou caminho no binário** — e
**duas compilações do MESMO fonte diferem.** **Isso destrói o diff** — **e você descobre
comparando dois builds idênticos primeiro.**

⚠ **A boa prática, e é um teste:**

> **Antes de diffar N-1 contra N, diffe N-1 contra N-1.** **Se der diferença, o build não é
> determinístico** — e você precisa de outra abordagem.

⚠ **E o `DiffRays` resolve parte disso:** ele **baixa os binários oficialmente publicados do
fornecedor** — **que são do mesmo pipeline, com a mesma proveniência.** **É a razão de ele
automatizar o passo com confiança.**

```bash
cd ~/patch-lab

echo "═══ 3. o teste de proveniência ═══"
echo
cat > testa-proveniencia.sh <<'SCRIPT'
#!/usr/bin/env bash
# testa-proveniencia.sh — verifica se o par de binários é diffável
set -uo pipefail

A="${1:?uso: testa-proveniencia.sh <binario-A> <binario-B>}"
B="${2:?informe o segundo binário}"

echo "═══════════ TESTE DE PROVENIÊNCIA ═══════════"
echo

for f in "$A" "$B"; do
    echo "── ${f} ──"
    file "$f" | sed 's/^/  /'
    printf '  tamanho : %s bytes\n' "$(stat -c %s "$f")"
    # arquitetura
    readelf -hW "$f" 2>/dev/null | grep -E 'Machine|Type' | sed 's/^/  /'
    # compilador (string do GCC no binário)
    cc=$(strings "$f" 2>/dev/null | grep -oE 'GCC: \([^)]*\) [0-9.]+' | head -1)
    printf '  compilador: %s\n' "${cc:-não identificado}"
    # build id
    bid=$(readelf -nW "$f" 2>/dev/null | grep -i 'Build ID' | awk '{print $NF}')
    printf '  build id  : %s\n' "${bid:-não presente}"
    # PIE
    readelf -hW "$f" 2>/dev/null | grep -q 'Type: *DYN' && echo "  PIE: sim" || echo "  PIE: não"
    echo
done

echo "── COMPARAÇÃO ──"
printf '  tamanhos iguais?    '
[ "$(stat -c %s "$A")" = "$(stat -c %s "$B")" ] && echo "sim" || echo "não (esperado, se o patch mudou código)"
echo

echo "── O TESTE DECISIVO ──"
cat <<'EXPL'
  ⚠ diffe a MESMA VERSÃO contra ela mesma, se puder:
     · se dois builds da MESMA versão diferem em muitas funções
       → o build NÃO é determinístico
       → e o diff N-1 vs N será ruído

  ✓ boa proveniência:
     · mesmo fornecedor
     · mesmo compilador (a string acima bate?)
     · builds publicados, não recompilados por você
EXPL

# se as duas entradas forem o mesmo arquivo, avisa
[ "$A" = "$B" ] && echo "  ⚠ você passou o MESMO arquivo — é o teste de determinismo"
SCRIPT

chmod +x testa-proveniencia.sh

echo "═══ e o teste do determinismo ═══"
echo
cat <<'EXPL'
  ── para verificar se um build é determinístico ──
     1. compile o MESMO fonte duas vezes
     2. compare os dois binários
     3. ⚠ se diferirem, o build não é determinístico

     gcc -o a1 fonte.c && sleep 1 && gcc -o a2 fonte.c
     cmp a1 a2 && echo "✓ determinístico" || echo "⚠ NÃO determinístico"

  ⚠ e se NÃO for, o diff contra o binário oficial será ruído.
     ✓ a solução: use os binários OFICIAIS do fornecedor
        (é o que o DiffRays faz)
EXPL

# demonstra com um arquivo de teste
cat > t.c <<'EOF'
#include <stdio.h>
int main(void){ printf("teste\n"); return 0; }
EOF
gcc -o /tmp/det1 t.c && sleep 1 && gcc -o /tmp/det2 t.c
echo
echo "  ── demonstrando com o seu compilador ──"
if cmp -s /tmp/det1 /tmp/det2; then
    echo "     ✓ os dois builds são IDÊNTICOS — build determinístico"
else
    echo "     ⚠ os dois builds DIFEREM — build não determinístico"
    echo "        (compare: cmp /tmp/det1 /tmp/det2)"
fi
```

⚠ **O teste do determinismo é o primeiro passo de qualquer sessão de diff.** **Se o seu próprio
compilador não é determinístico, o diff contra o binário oficial é ruído** — **e você passa horas
olhando a coisa errada.**

⚠ **E é a razão de o `DiffRays` usar os binários **publicados**: `** eles vêm do **mesmo pipeline**,
com a **mesma proveniência**. **Você não recompila — você baixa o que o fornecedor publicou.**

**Produza `proveniencia.md`:**

| Item | Binário A | Binário B |
|---|---|---|
| Tamanho | | |
| Arquitetura | | |
| Compilador | | |
| Build ID | | |
| PIE | | |

**Responda:**

1. **Os compiladores batem?** Se não, o diff será ruído.
2. **O seu build é determinístico?** O teste disse o quê?
3. **Por que usar os binários oficiais** e não recompilar?
4. **O que fazer se o build não for determinístico?**

---

## 1.3 O primeiro par

⚠ **A escolha do primeiro par define o aprendizado. E o critério não é "o CVE mais famoso".**

| Critério | Por quê |
|---|---|
| **Patch pequeno** | ⚠ **Menos ruído, mais aprendizado** |
| **Binário pequeno** | A leitura cabe |
| **Fonte disponível também** | ✓ Você confere a sua leitura |
| **CVE com descrição clara** | Dá o contexto |
| **CWE interessante** | Módulo 4 do Pesquisa |
| ⚠ **Não comece pelo kernel** | Volume e ruído |

⚠ **A quarta linha é ouro quando existe.** **Se o patch de fonte está publicado E você tem os
binários**, você pode **diffar o binário e conferir contra o fonte** — **e é assim que você calibra
a leitura de binário.** **É o melhor exercício possível.**

⚠ **A tabela do que escolher, por dificuldade:**

| Alvo | Dificuldade | Serve para |
|---|---|---|
| Utilitário pequeno em C | ✓ Baixa | Aprender o processo |
| Biblioteca de parsing | ✓ Média | Caso real |
| Servidor de rede | Média | Caso real, mais código |
| Navegador | ⚠ Alta | Só depois |
| **Kernel do Linux** | ⚠⚠ Muito alta | ⚠ Não para começar |

⚠ **A última linha é a mais tentadora e a mais enganosa.** **O kernel publica patch de fonte
todos os dias** — o que parece fácil. **Mas o binário é gigante, o ruído é alto, e a leitura exige
contexto de subsistema.** **É excelente material — depois.**

⚠ **E o material do curso profissional confirma a escolha:** **"Patch Diffing In The Dark"**
começa por **aplicativos do Windows** — **binários médios, com CVE claro, e com símbolos
disponíveis.** **É o caminho sensato.**

⚠ **A recomendação do curso:** **comece por uma biblioteca de parsing pequena, com o commit
publicado.** **Você diffa o binário, confere contra o fonte, e calibra.**

```bash
cd ~/patch-lab

echo "═══ 4. escolhendo o primeiro par ═══"
echo
cat > escolha-par.md <<'EOF'
# Escolha do primeiro par

## Critérios
| Critério | Peso | Por quê |
|---|---|---|
| Patch pequeno | alto | menos ruído |
| Binário pequeno | alto | leitura cabe |
| Fonte também disponível | ⚠ muito alto | permite calibrar |
| CVE com descrição clara | médio | contexto |
| CWE interessante | médio | padrão |
| NÃO kernel/navegador | ⚠ alto | volume |

## Candidatos
| # | Projeto | CVE | Tem fonte? | Tam. binário | CWE | Escolha? |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

## O escolhido
| Item | Valor |
|---|---|
| Projeto | |
| CVE | |
| Versão N-1 | |
| Versão N | |
| Commit (se houver) | |
| CWE | |
| Por que este | |

## Onde obter os binários
| Fonte | URL |
|---|---|
| release oficial N-1 | |
| release oficial N | |

## O que eu vou fazer
1. baixar os DOIS binários oficiais (não recompilar)
2. testar a proveniência
3. diffar com Ghidra
4. ⚠ conferir contra o fonte, se houver
EOF

cat escolha-par.md

echo
echo "═══ 5. onde obter os pares ═══"
echo
cat <<'EXPL'
  ── BINÁRIOS (para o cenário 2) ──
     · release oficial do projeto (GitHub Releases)
     · pacote da distribuição (versão N-1 e N)
     · Microsoft Patch Tuesday (Windows)  ← o mais sistemático
     · Red Hat / Debian / Ubuntu security tracker

  ── FONTE (para o cenário 1) ──
     · GitHub Advisories  → linkam o commit
     · oss-security       → a lista de divulgação
     · git log --grep='CVE'

  ── ⚠ A REGRA ──
     use os binários OFICIAIS. não recompile o fonte.
     recompilar muda a proveniência e destrói o diff.

  ── E O DIFRAYS ──
     ✓ automatiza: dado o CVE, identifica o componente,
        baixa os dois binários OFICIAIS, e roda o diff.
     ⚠ é o passo que trava o iniciante — e agora é automático.
     ✓ mas ENTENDA o processo antes de confiar na saída.
EXPL
```

⚠ **A regra do "não recompilar" é a mais importante do módulo.** **Recompilar muda o compilador, as
flags e a proveniência** — **e o diff contra o binário oficial vira ruído puro.**

⚠ **E o `DiffRays` resolve isso por design:** ele **baixa os dois binários do fornecedor** — **que
vêm do mesmo pipeline.** **É por isso que ele automatiza com confiança, e você não deveria
recompilar.**

**Produza `primeiro-par.md`:**

| Item | Valor |
|---|---|
| Projeto | |
| CVE | |
| N-1 | |
| N | |
| Tem fonte? | |
| CWE | |

**Responda:**

1. **Por que não começar pelo kernel?**
2. **Por que ter o fonte também é valioso?**
3. **Por que não recompilar o fonte?**
4. **O que o `DiffRays` automatiza?** Por que é confiável?

---

## 1.4 LAB — Monte o laboratório

**Duração:** 60 min

### Passo 1 — A estrutura e as ferramentas (25 min)

```bash
cd ~/patch-lab

cat > monta-lab.sh <<'SCRIPT'
#!/usr/bin/env bash
set -uo pipefail

echo "═══ MONTANDO O LABORATÓRIO DE PATCH DIFFING ═══"
echo

for d in alvos diffs ferramentas caderno; do
    mkdir -p "$d"
    printf '  ✓ %s/\n' "$d"
done
echo

# READMEs
cat > alvos/README.md <<'EOF'
# Alvos — os PARES de binários

## Convenção
   <projeto>-<versao>-<cve>/
     ├── N-1/     ← vulnerável
     ├── N/       ← corrigida
     └── NOTAS.md ← proveniência

## ⚠ REGRA
   · use os binários OFICIAIS do fornecedor
   · NÃO recompile o fonte
   · registre: de onde veio cada um, e quando
EOF

cat > diffs/README.md <<'EOF'
# Diffs

## Convenção
   <projeto>-<cve>-<ferramenta>.txt
   ex.: libx-2024-1234-ghidra.txt

## O que registrar por diff
| Campo | Valor |
|---|---|
| Ferramenta | |
| Funções alteradas | |
| Sinal identificado | |
| Ruído descartado | |
EOF

cat > ferramentas/README.md <<'EOF'
# Ferramentas

| Ferramenta | Instalada? | Versão |
|---|---|---|
| Ghidra | | |
| BinDiff | | |
| Ghidriff | | |
| DiffRays | | |
| Diaphora | | |
| pwntools | | |

⚠ comece pelo Ghidra MANUAL. automatize depois.
EOF

cat > caderno/README.md <<'EOF'
# Caderno — módulo 3 do curso de Pesquisa

## Estrutura por investigação
- ID e título
- pergunta
- de onde veio (CVE / commit)
- invariante
- hipótese
- ⚠ critério de falsificação
- teste
- evidência (comando + saída)
- conclusão (confirmou / falsificou / inconclusivo)
- sobras
EOF

echo "  ✓ READMEs criados"
echo

echo "═══ VERIFICANDO AS FERRAMENTAS ═══"
echo
printf '  %-16s ' "gcc:"; gcc --version 2>/dev/null | head -1 || echo "⚠ ausente"
printf '  %-16s ' "ghidra:"; (command -v ghidra || ls /opt/ghidra* /usr/share/ghidra 2>/dev/null | head -1) || echo "⚠ ausente — baixe de ghidra-sre.org"
printf '  %-16s ' "binutils:"; readelf --version 2>/dev/null | head -1 || echo "⚠ ausente"
printf '  %-16s ' "python:"; python3 --version 2>/dev/null || echo "⚠ ausente"
printf '  %-16s ' "pwntools:"; python3 -c "import pwn; print(pwn.__version__)" 2>/dev/null || echo "⚠ ausente (pip3 install pwntools)"
printf '  %-16s ' "ropper:"; ropper --version 2>/dev/null | head -1 || echo "⚠ ausente"
echo

echo "── ⚠ o que falta instalar ──"
cat <<'EXPL'
  sudo apt install -y gcc gdb git curl jq binutils file
  pip3 install pwntools ropper

  ── Ghidra (não está no apt em todas as distros) ──
     baixe de: https://ghidra-sre.org/
     descompacte em /opt/ghidra
     ✓ precisa de Java 17+

  ── DiffRays / Ghidriff (opcionais, via git) ──
     git clone https://github.com/pwnfuzz/diffrays
     git clone https://github.com/clearbluejar/ghidriff
EXPL

echo
echo "═══ A ESTRUTURA ═══"
find . -type f -o -type d | sort | sed 's/^/  /' | head -20
SCRIPT

chmod +x monta-lab.sh
./monta-lab.sh
```

Produza `estrutura.md`:

| Pasta | O que guarda | Regra |
|---|---|---|
| `alvos/` | | |
| `diffs/` | | |
| `ferramentas/` | | |
| `caderno/` | | |

**Responda:**

1. **A proveniência vai em qual pasta?** Por quê?
2. **Qual ferramenta você começa usando?** Por quê?
3. **Quais ferramentas estão ausentes** no seu sistema?
4. **O que a pasta `caderno/` segue?** De qual curso?

### Passo 2 — Verifique a proveniência do seu par (35 min)

⚠ **Baixe os dois binários **oficiais** — ou use o par do seu sistema.**

```bash
cd ~/patch-lab

echo "═══ ESCOLHENDO UM PAR DISPONÍVEL NO SEU SISTEMA ═══"
echo
cat <<'EXPL'
  ⚠ se você ainda não escolheu um CVE, use um par do SEU sistema:

  ── opção A: duas versões de um pacote ──
     · baixe N-1 e N do repositório do projeto
     · ou use /var/cache/apt/archives se tiver

  ── opção B: compile o MESMO fonte com flags diferentes ──
     ⚠ NÃO serve para diff de CVE — mas SERVE para
        treinar a leitura de sinal vs. ruído (módulo 5)

     gcc -O0 -o alvo_O0 alvo.c
     gcc -O2 -o alvo_O2 alvo.c
     ✓ e você vê o ruído de otimização com os próprios olhos

  ── opção C: dois binários do sistema ──
     /usr/bin/ls  vs  uma cópia recompilada
     ⚠ não é de CVE — é para o exercício de proveniência
EXPL

# demonstração com o mesmo fonte e flags diferentes
cat > /tmp/alvo.c <<'EOF'
#include <stdio.h>
#include <string.h>
#include <stdint.h>

/* ⚠ alvo didático: contém uma verificação que some com otimização */
int processa(const char *entrada, size_t n) {
    char buf[64];
    if (n > sizeof(buf) - 1) {
        return -1;                      /* ⚠ a verificação */
    }
    memcpy(buf, entrada, n);
    buf[n] = '\0';
    return (int)strlen(buf);
}

int main(int argc, char **argv) {
    if (argc < 2) return 2;
    printf("r=%d\n", processa(argv[1], strlen(argv[1])));
    return 0;
}
EOF

gcc -O0 -o /tmp/alvo_O0 /tmp/alvo.c 2>/dev/null
gcc -O2 -o /tmp/alvo_O2 /tmp/alvo.c 2>/dev/null

echo "  ✓ dois binários do MESMO fonte, com -O0 e -O2"
echo
./testa-proveniencia.sh /tmp/alvo_O0 /tmp/alvo_O2 2>/dev/null | head -30

echo
echo "═══ O QUE ISSO MOSTRA ═══"
echo
cat <<'EXPL'
  ⚠ mesmo fonte, flags diferentes → binários diferentes.
     · o tamanho muda
     · o número de funções muda (inline)
     · ⚠ e é ISSO que o ruído é.

  ✓ e no diff de CVE, o ruído vem de:
     · build diferente do mesmo fonte
     · versão de compilador
     · flags

  ⚠ a lição: se você recompilar o fonte, o diff NÃO é comparável
     ao binário oficial.
EXPL

echo
echo "═══ SINAL E RUÍDO, antecipando o módulo 5 ═══"
cat <<'EXPL'
  ── compare os dois disassemblies ──
     diff <(objdump -d /tmp/alvo_O0) <(objdump -d /tmp/alvo_O2) | head -20

  ⚠ o que você vai ver:
     · quantidades enormes de diferença
     · ⚠ e NENHUMA delas é de segurança
     · é o mesmo código, com forma diferente

  ✓ é exatamente a distinção que o módulo 5 formaliza:
     mudança de CONTROLE DE FLUXO é sinal.
     mudança de FORMA é ruído.
EXPL
```

Produza `proveniencia.md`:

| Item | `alvo_O0` | `alvo_O2` |
|---|---|---|
| Tamanho | | |
| Compilador | | |
| Build ID | | |
| Determinístico? | | |

**Responda:**

1. **O mesmo fonte com flags diferentes dá binários iguais?**
2. **Quantas diferenças o `diff` do disassembly mostra?**
3. **Alguma delas é de segurança?** Por quê não?
4. **O que isso ensina sobre recompilar** o fonte?

### Passo 3 — O caderno da primeira investigação (20 min)

```bash
cd ~/patch-lab

cat > caderno/PD-001.md <<'EOF'
# PD-001 — [título]

**Data:** ____
**Estado:** aberta

## 1. A pergunta
[qual pergunta sobre o patch]

## 2. De onde veio
| Item | Valor |
|---|---|
| CVE | |
| Commit (se houver) | |
| Versão N-1 | |
| Versão N | |
| CWE | |

## 3. A proveniência
| Item | N-1 | N |
|---|---|---|
| Fonte (URL) | | |
| Compilador | | |
| Taxa de determinismo | | |

## 4. O invariante (a preencher no módulo 3)
[o que DEVE valer]

## 5. A hipótese
| Campo | Valor |
|---|---|
| Invariante | |
| Afirmação | |
| Observação | |
| **Critério de falsificação** | |

## 6. O teste
| Item | Valor |
|---|---|
| Método | diff de fonte / diff de binário |
| Ferramenta | |
| ⚠ Autorização | |

## 7. Evidência
```
[comando + saída literal]
```

## 8. Conclusão
[confirmou / falsificou / inconclusivo]

## 9. O que isso destrava
[a próxima pergunta]

## 10. Referências
[links]
EOF

echo "═══ o caderno criado ═══"
cat caderno/PD-001.md | head -25
echo
echo "  ⚠ a seção 5 tem o critério de falsificação — módulo 6 do Pesquisa."
echo "     sem ele, não é hipótese."
```

Produza `caderno-pd001.md`:

| Seção | Preenchida |
|---|---|
| Pergunta | |
| De onde veio | |
| Proveniência | |
| **Critério de falsificação** | |

**Responda:**

1. **Qual CVE você escolheu?** Ou qual par?
2. **A proveniência está registrada?** De onde veio cada binário?
3. **O critério de falsificação está escrito?**
4. **O caderno segue qual estrutura?** De qual curso?

### Critérios de aceitação

- `cenarios.md` com os **três** cenários e o que cada um dá.
- Você explicou **o que o diff não dá** — cite quatro.
- Você explicou **por que ler o diff inteiro**.
- `proveniencia.md` com a comparação medida dos **dois** binários.
- Você explicou **por que recompilar destrói o diff**.
- O **teste de determinismo** rodou, com o resultado.
- `primeiro-par.md` com o par escolhido e o critério.
- Você explicou **por que não começar pelo kernel**.
- O laboratório montado com as **quatro** pastas e os READMEs.
- `estrutura.md` com o que cada pasta guarda.
- Você demonstrou a diferença `-O0` vs. `-O2` **no mesmo fonte**.
- Você explicou **por que nenhuma dessas diferenças é de segurança**.
- `caderno/PD-001.md` criado, com o **critério de falsificação**.
- ⚠ **Nenhum alvo de terceiro.** Diff de binário público, no seu laboratório.

---

## Avaliação

1. **Por que o diff é a fonte mais honesta?**
2. **Cite os três cenários** e o que cada um dá.
3. **Qual cenário é o mais difícil?** Por quê?
4. **O que "código do patch localizado" significa?**
5. **O que o diff dá?** Cite quatro.
6. **O que o diff NÃO dá?** Cite quatro.
7. **Por que ler o diff inteiro**, e não só o trecho citado?
8. **O que a proveniência decide?**
9. **Cite cinco fontes de ruído.**
10. **Qual é a pior?** Por quê?
11. **Qual o teste de determinismo?** Descreva.
12. **Por que usar os binários oficiais** e não recompilar?
13. **O que o `DiffRays` automatiza?** Por que é confiável?
14. **Qual o critério de escolha do primeiro par?**
15. **Por que o fonte também disponível é valioso?**
16. **Por que não começar pelo kernel?**
17. **O que o `EnBinDiff` mediu?** Por que importa?
18. **O que o `PLocator` faz?**
19. **Por que o caderno segue o módulo 3 do Pesquisa?**
20. **O que o diff permite** que a ferramenta não permite?

---

**Próximo:** [Módulo 2 — Ambiente e proveniência do build](modulo-02.md)
