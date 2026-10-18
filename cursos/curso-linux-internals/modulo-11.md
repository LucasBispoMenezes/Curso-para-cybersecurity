# Módulo 11 — Método: do CVE ao Laboratório Reproduzível, e o Reporte

**Curso:** Linux Internals, Kernel e Escalonamento de Privilégios
**Módulo:** 11 de 11 · 3 horas
**Pré-requisitos:** Módulos 1 a 10
**Próximo:** —

---

## O que este módulo entrega

Ao final, você vai saber **transformar os dez módulos anteriores em trabalho**: escolher um alvo com critério, montar a hipótese, montar o laboratório, **medir a reprodução**, escrever o reporte e divulgar. É o módulo que separa "eu li sobre" de "eu acho".

---

## 11.1 O método, em sete passos

```
   1. ALVO       →  por que este subsistema, e por que agora?
   2. HIPÓTESE   →  qual invariante pode estar violado?
   3. MAPEAMENTO →  onde no código essa invariante deveria valer?
   4. LAB        →  kernel compilado, KASAN, versão exata
   5. TRIGGER    →  o minimo que dispara — e a taxa medida
   6. CAUSA      →  a classe, a janela, e a correção
   7. REPORTE    →  escrito para quem vai corrigir
```

⚠ **O passo 2 é o que separa operador de pesquisador — e é a mesma distinção do curso de Pesquisa em Segurança.** "Vou testar coisas" não é hipótese. `"Este caminho de erro pode esquecer o put_ref, e o objeto fica com referência a mais"` é.

---

## 11.2 Escolher o alvo

⚠ **A tabela de critérios — e a razão de cada um:**

| Critério | Pergunta | Peso |
|---|---|---|
| **Alcance** | ⚠ Preciso de privilégio para chegar? | Alto |
| **Maturidade** | Já foi muito auditado? | ⚠ **Invertido** |
| **Complexidade** | ⚠ Há parser, estado e concorrência? | Alto |
| **Versão** | Que faixa de kernel é afetada? | Alto |
| **Tipo** | Objeto, VM, parser ou semântica? | Médio |

⚠ **A maturidade é invertida, e o dado é este:** um subsistema **novo** acumula bug depois do primeiro `privesc` público — todos os CVE dos módulos 5, 6, 9 e 10 apareceram em janela curta após o primeiro. Foi assim com `io_uring` (2021 em diante), com `nftables` (2022 em diante) e com o `keyring`.

```bash
# 1. A versao exata do alvo — sempre o primeiro comando
uname -r
cat /proc/version

# 2. O tamanho do subsistema (proxy de complexidade)
K=~/linternals-lab/kernel
wc -l $K/io_uring/*.c $K/net/netfilter/nf_tables_api.c $K/kernel/bpf/verifier.c 2>/dev/null

# 3. O alcance: quem pode chegar ate este subsistema?
#    (o passo 6 do modulo 6 — mapear, seguir, validar, objeto, erro, ALCANCE)
grep -rn 'unprivileged\|ns_capable\|capable(' $K/net/netfilter/nf_tables_api.c | wc -l

# 4. A idade do codigo — commits por ano
git -C $K log --oneline --since='2023-01-01' -- io_uring/ | wc -l
git -C $K log --oneline --since='2023-01-01' -- net/netfilter/ | wc -l
```

```bash
# 5. O historico da AREA — a evidencia mais barata que existe
git -C $K log --oneline --grep='use-after-free' -- net/netfilter/ | head -20
git -C $K log --oneline --grep='double free\|UAF' -- io_uring/ | head -20

# ⚠ Se um subsistema tem 15 commits com "use-after-free" na descricao,
#    ele tem a CLASSE ali, e a probabilidade de a decima sexta existir e alta.
```

---

## 11.3 A hipótese — escrever antes de testar

⚠ **O formato que o curso usa, e que você deve escrever em uma ficha antes de tocar no código:**

```
FICHA DE HIPOTESE
─────────────────────────────────────────────────────────
Subsistema:   nf_tables  (nft_byteorder)
Classe:       VM — out-of-bounds em registrador
Invariante:   "o passo do byteorder cabe na largura do registrador"
Onde deveria valer:  nft_byteorder_eval(), validacao de len/step
Como poderia falhar:  step > largura, sem checagem, com valor derivado
                      de atributo netlink
Falsificacao: se o verifier/parser valida step contra largura, a hipotese
              morre — e o custo foi de 20 minutos de leitura
─────────────────────────────────────────────────────────
```

⚠ **O campo `Falsificacao` é obrigatório.** Uma hipótese que não pode morrer não é hipótese — é crença. O valor de escrever isso **antes** é que você não vai "achar" o bug por confirmação de expectativa.

---

## 11.4 O laboratório — a versão exata importa

⚠ **O erro mais comum, e o que mais custa tempo:** testar na versão errada.

| O que determina | Por quê |
|---|---|
| **`git describe --tags`** | O CVE é de uma faixa; fora dela, o bug não existe |
| **`.config`** | ⚠ `KASAN`, `slab_debug`, `CONFIG_BPF` mudam o resultado |
| **Arquitetura** | ⚠ Divergência verifier×JIT é por arquitetura (módulo 10) |
| **Namespace** | ⚠ O `unshare -Ur` é habilitador — e ele também é exigência de versão |

```bash
cd ~/linternals-lab/kernel
git describe --tags                    # ou: git log -1 --format='%H %d'

# ⚠ Volte o kernel para a versao do alvo — e recompile
git checkout v6.6.14
make olddefconfig
scripts/config --enable KASAN --enable DEBUG_INFO_DWARF5 --disable DEBUG_INFO_NONE
make -j"$(nproc)" -s 2>&1 | tail -3

# Registre a configuracao junto com o trigger
cp .config ~/linternals-lab/m11/config-usada
```

⚠ **E anote o que a sua `config` liga:** um trigger reproduz com `KASAN` e não reproduz sem ele não é "instável" — é **dependente de instrumentação**. Isso é informação de valor, não ruído: significa que a janela é curta e o KASAN a alarga.

---

## 11.5 Medir a reprodução

⚠ **A métrica que transforma observação em achado:**

```bash
#!/usr/bin/env bash
# taxa.sh — a medida de reprodutibilidade
N="${1:-200}"; HITS=0
for i in $(seq 1 "$N"); do
  sudo dmesg -C >/dev/null 2>&1
  ./trigger >/dev/null 2>&1
  if sudo dmesg | grep -qi 'KASAN\|BUG:\|WARNING:'; then
    HITS=$((HITS+1)); echo "hit $HITS em $i"
    sudo dmesg | grep -A20 'KASAN' | head -30 >> rodada-$i.txt
  fi
done
echo "════════════════════════════"
echo "hits: $HITS / $N  ($(( 100*HITS/N ))%)"
```

| Taxa | Leitura | Ação |
|---|---|---|
| **200/200** | ✅ Determinístico | Reporte |
| **50–199** | ⚠ Race real | Alargue a janela (`userfaultfd`, threads) |
| **1–49** | ⚠ Janela estreita | Documente a taxa — é achado, com ressalva |
| **0** | ❌ | **Reveja a hipótese**, ou a versão, ou a `config` |

⚠ **Uma taxa baixa não invalida o achado — mas muda como você o reporta.** "Reproduz em 3% das execuções, com N threads e afinidade fixa" é um reporte honesto e útil. "Reproduz sempre" quando reproduz 3% é um reporte que queima sua credibilidade na primeira tentativa do outro lado.

---

## 11.6 Diagnóstico: da falha à causa

⚠ **O ciclo que você vai repetir, e as três perguntas de cada relatório:**

```
   KASAN diz: "use-after-free in X"
        │
        ├─ Q1: em qual CACHE o objeto nasceu?     → modulo 3
        │      (o KASAN responde: "Allocated by")
        │
        ├─ Q2: quem LIBEROU, e por qual caminho?  → modulo 4
        │      (o KASAN responde: "Freed by")
        │      ⚠ um caminho de erro? um cancelamento?
        │
        └─ Q3: qual a JANELA, e ela e fechavel?   → modulo 4
               (medida no 11.5)
```

```bash
# O relatorio do KASAN, lido por inteiro
sudo dmesg | grep -B2 -A40 'KASAN'
# ⚠ leia as TRES secoes: in / Freed by / Allocated by

# Confirme a hipotese no codigo — so agora
grep -n -B3 -A8 'kfree\|fput\|put_cred' ~/linternals-lab/kernel/net/netfilter/nft_$$.c 2>/dev/null

# E confirme a correção no upstream
git -C ~/linternals-lab/kernel log --oneline --all --grep='use-after-free' | head -10
```

⚠ **A última linha é o passo que fecha o ciclo e o que valida tudo:** se o upstream tem um commit que corrige **exatamente** o que você achou, você reproduziu um bug real — e o commit mostra a correção. Se não tem, você tem **duas** possibilidades: um achado novo (0-day), ou um erro seu. A proporção histórica é fortemente a favor da segunda — **e a honestidade aqui é o que separa você de um falso positivo público.**

---

## 11.7 O reporte

⚠ **A estrutura, e cada seção existe por um motivo:**

```markdown
# <Subsistema>: <classe> em <função>

## Resumo
Uma frase: o que é, o que permite, em que faixa.

## Versões afetadas
Exata. `git describe` da faixa em que reproduziu.

## Pré-requisito de acesso
⚠ O que o atacante precisa ter. Sem privilégio? Com user ns?
Com CAP_x? — É o item que define a gravidade.

## Causa raiz
A invariante violada, e onde ela deveria valer.
⚠ Uma frase, não um parágrafo. Se não cabe em uma frase, não está entendida.

## Reprodução
Config do kernel. Comando. ⚠ A TAXA, com o número de execuções.

## Evidência
O relatório do KASAN, com as três seções.
⚠ Não o exploit — a PRIMITIVA demonstrada.

## Impacto
O que a primitiva permite. Sem exagerar.

## Correção sugerida
E o commit upstream, se existir.

## Divulgação
Data, canal, prazo.
```

⚠ **Três erros que invalidam um reporte técnico bom:**

| Erro | Por quê |
|---|---|
| **Exagerar o impacto** | "RCE remoto" quando é local com `user ns` |
| ⚠ **Omitir a taxa** | Sem ela, o outro lado não consegue reproduzir — e descarta |
| ⚠ **Mandar o exploit** | O que se reporta é a **primitiva**; a cadeia completa é outra coisa |

⚠ **O último item é decisão sua, e é política — não técnica.** Reportar a primitiva permite corrigir; mandar a cadeia completa pode expor mais do que o necessário. A prática corrente é: **primitiva + impacto demonstrado, sem a cadeia de escalação**. Quem decide isso é você, e depende do destinatário e do programa.

---

## 11.8 Divulgação e ética

⚠ **O curso demonstra e reporta. Não ataca.**

| Situação | O que fazer |
|---|---|
| Kernel do seu sistema, no seu lab | ✅ Analise e reporte |
| Kernel de um alvo com contrato | ✅ Autorização escrita, escopo definido |
| Kernel de sistema de terceiro sem autorização | ❌ Não é pesquisa — é ataque |
| CVE não corrigido, público | ⚠ Coordene: `security@kernel.org`, 90 dias usuais |
| Bug em subsistema de nuvem | ⚠ Vai para o provedor, não para o `lore` |

⚠ **O limite é o mesmo dos outros cursos do material, e vale a pena escrever:** *a vulnerabilidade que você achar num kernel que não é seu é um achado de outra pessoa.* Reportar é trabalho técnico; explorar sem autorização é outra coisa — e essa distinção não é burocracia, é o que faz a área existir.

---

## Laboratório 11 — O ciclo completo

⚠ **Não testado em VM. Valide no seu ambiente antes de publicar o lab. Este é o laboratório que fecha o curso — e o único que exige os dez anteriores.**

**Objetivo:** produzir **um** achado completo. Não precisa ser 0-day; reproduzir um CVE conhecido com método próprio **é** o exercício.

```bash
cd ~/linternals-lab/m11
mkdir -p alvo && cd alvo

# ── PASSO 1: ALVO ──────────────────────────────────────────────
# Escolha UM subsistema dos modulos 5, 6, 9 ou 10.
# Justifique com os criterios do 11.2 (alcance, maturidade, complexidade).

# ── PASSO 2: HIPOTESE ──────────────────────────────────────────
cat > hipotese.md <<'EOF'
Subsistema:
Classe:            (objeto / VM / parser / semantica)
Invariante:
Onde deveria valer:
Como poderia falhar:
Falsificacao:
EOF
# ⚠ PREENCHA ANTES DE LER O CODIGO DE PRODUCAO

# ── PASSO 3: MAPEAMENTO ────────────────────────────────────────
# Os seis passos do modulo 6.6, aplicados ao seu alvo:
#   mapear, seguir, validar, objeto, ERRO, alcance

# ── PASSO 4: LAB ───────────────────────────────────────────────
git -C ~/linternals-lab/kernel log -1 --format='%H %d'
cp ~/linternals-lab/kernel/.config config-usada
grep -E 'KASAN|SLUB_DEBUG|BPF|USER_NS' config-usada

# ── PASSO 5: TRIGGER + TAXA ────────────────────────────────────
# Escreva o MINIMO que dispara. Depois rode taxa.sh do 11.5.

# ── PASSO 6: CAUSA ─────────────────────────────────────────────
# As tres perguntas: cache? quem liberou? qual a janela?

# ── PASSO 7: REPORTE ───────────────────────────────────────────
# A estrutura do 11.7, preenchida.
```

**O que observar:** o passo 2 é o mais desconfortável e o mais importante. Se você não consegue preencher `Falsificacao`, você não tem hipótese — tem vontade. E se a hipótese morrer na leitura do código, **o exercício funcionou**: você gastou vinte minutos em vez de três dias.

**Exercício final:** escreva o reporte do 11.7 **completo**, mesmo que o achado seja uma reprodução de CVE conhecido. Depois releia e corte tudo que for adjetivo. O reporte que sobra é o que vale.

---

## Resumo

- O método tem **sete passos**: alvo, hipótese, mapeamento, lab, trigger, causa, reporte.
- ⚠ **Hipótese com falsificação** — se não pode morrer, é crença, e a confirmação de expectativa produz falso positivo.
- Escolha alvo por **alcance, maturidade invertida, complexidade e versão**; o `git log --grep='use-after-free'` é a evidência mais barata que existe.
- ⚠ **A versão exata e a `config` determinam o resultado** — reproduzir só com KASAN é informação, não ruído.
- ⚠ **A taxa de reprodução é parte do achado.** 3% documentado vale mais que "sempre" desmentido.
- O relatório do KASAN responde três perguntas: **em qual cache, quem liberou, qual a janela**.
- ⚠ **Reporte-se a primitiva, não a cadeia** — e a linha entre pesquisa e ataque é a autorização.

---

## Fim do curso

Você atravessou a fronteira do módulo 1, aprendeu a ler o ring 0 no 2, e passou por heap, concorrência e cinco subsistemas. O que fica não é uma lista de CVE — é **uma pergunta**, aplicável a qualquer código de kernel que você ler:

> **Onde este código confia em dado que não deveria — e quem valida?**

⚠ **E o próximo passo natural da trilha é o `Windows Internals`.** O método é o mesmo; o mapa é completamente outro. Você já tem a pergunta; falta o outro território.
