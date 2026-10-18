# Módulo 8 — Reproduzir o 1-day

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 7 · curso de Exploit Development

---

## Objetivos

1. Entender o que significa **reproduzir**, e onde isso termina.
2. Construir o **reproducer** — entrada, alvo, e critério.
3. Distinguir **reproduzir** de **explorar** — e por que a linha importa.
4. Usar reproducer **mínimo** — o que basta para confirmar.
5. Medir e registrar — o reproducer é evidência, não arma.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Reproduzir é confirmar que a versão N-1 faz o que a N recusa.** **Não é construir exploit.**

⚠ **E a distinção, escrita, porque ela é a linha do módulo:**

| Reproduzir | Explorar |
|---|---|
| Confirma a **diferença de comportamento** | ⚠ **Obtém controle** |
| Entrada que causa a **falha** | Entrada que causa **execução** |
| **Seu alvo**, compilado ou baixado | ⚠ **Sistema em uso** |
| Evidência para o relatório | ⚠ Arma |
| ✓ Requerido | ⚠ **Não é este curso** |

⚠ **A tese:**

> **O reproducer prova que o achado é real.** **E é onde você PARA** — **porque a primitiva e a
> exploração são o curso de Exploit Development**, **e o destino da saída é o mantenedor, não um
> alvo.**

⚠ **E a razão de isso bastar:** **o mantenedor precisa de evidência, não de exploit.** **"A versão
N-1 processa a entrada X e a N recusa"** é **o suficiente para ele confirmar e corrigir.** **Um
exploit funcional não acrescenta nada ao relatório — e acrescenta risco.**

---

## 8.1 O que é um reproducer

⚠ **Um reproducer tem quatro partes, e todas são obrigatórias.**

| # | Parte | O que é |
|---|---|---|
| 1 | **O alvo** | ⚠ **Qual binário, qual versão, qual hash** |
| 2 | **A entrada** | O que causa a diferença |
| 3 | **O critério** | Como você sabe que reproduziu |
| 4 | **O ambiente** | Onde rodou |

⚠ **A parte 3 é a que a maioria esquece.** **"Reproduzi" sem dizer **como se sabe** não é
reprodução** — é afirmação. **O critério é:** **N-1 faz X, N faz Y, e Y é o comportamento
corrigido.**

⚠ **A tabela do que o reproducer **não** precisa:**

| Não precisa | Por quê |
|---|---|
| Ser mínimo em bytes | ⚠ Ajuda, mas não é obrigatório |
| Ser determinístico | ⚠ **Mas se não for, declare** |
| Funcionar em toda versão | Só na que você testou |
| Ser um exploit | ⚠ **É reproducer** |
| Ser bonito | É evidência |

⚠ **A linha do determinístico merece a nota.** **Se o reproducer funciona às vezes, você declara** —
**e a instabilidade também é informação.** **É o mesmo princípio do módulo 3 do curso de Exploit:**
**"funciona às vezes" aponta para ASLR ou estado.**

⚠ **E a linha "ser mínimo" é uma boa prática, não um requisito.** **Um reproducer de 4 KB
funciona** — **mas se você conseguir 8 bytes, o relatório fica mais convincente.** **A minimização é
o passo final, não o primeiro.**

```bash
mkdir -p ~/patch-lab/mod08 && cd ~/patch-lab/mod08

echo "═══ 1. as quatro partes do reproducer ═══"
echo
cat > reproducer.md <<'EOF'
# O reproducer — quatro partes obrigatórias

## 1. O ALVO
| Item | Valor |
|---|---|
| Binário | |
| Versão | |
| SHA-256 | |
| Origem (URL) | |

## 2. A ENTRADA
| Item | Valor |
|---|---|
| Formato | arquivo / argumento / stdin / rede |
| Conteúdo | |
| Tamanho | |

## 3. ⚠ O CRITÉRIO
| Item | Valor |
|---|---|
| O que o N-1 faz | |
| O que o N faz | |
| **Como eu sei que reproduzi** | |

## 4. O AMBIENTE
| Item | Valor |
|---|---|
| SO / arquitetura | |
| Dependências | |
| Data | |

## O que o reproducer NÃO precisa
| Item | Por quê |
|---|---|
| ser mínimo em bytes | ajuda, não é obrigatório |
| ser determinístico | ⚠ mas se não for, DECLARE |
| funcionar em toda versão | só na testada |
| ser um exploit | ⚠ é REPRODUCER |
| ser bonito | é evidência |
EOF

cat reproducer.md

echo
echo "═══ 2. o que o reproducer prova — e o que ele não prova ═══"
echo
cat <<'EXPL'
  ── ELE PROVA ──
     ✓ que a correção mudou o COMPORTAMENTO
     ✓ que o achado é real, não teórico
     ✓ que a sua leitura do diff estava certa
     ✓ e dá ao mantenedor o que ele precisa para confirmar

  ── ELE NÃO PROVA ──
     ✗ que é explorável
     ✗ o impacto real (depende do contexto)
     ✗ a severidade
     ✗ que outros caminhos não existem
     ✗ ⚠ e NÃO é uma arma

  ✓ lembre: o mantenedor confirma e corrige.
     um exploit funcional não acrescenta nada ao relatório
     — e acrescenta risco.
EXPL
```

⚠ **A segunda tabela é a que delimita o módulo.** **O reproducer prova a correção, não o impacto.**
**E é isso que o mantenedor precisa** — **porque a triagem de severidade é trabalho dele.**

⚠ **E é a mesma postura do módulo 10 do curso de Pesquisa:** **você reporta o que verificou, e
declara o que não verificou.** **Aqui, o reproducer é a evidência; a exploração é outra coisa.**

**Produza `reproducer.md`:**

| Parte | O valor no seu caso |
|---|---|
| Alvo | |
| Entrada | |
| **Critério** | |
| Ambiente | |

**Responda:**

1. **Qual das quatro partes a maioria esquece?** Por quê?
2. **O que o reproducer prova?** Cite três.
3. **O que ele não prova?** Cite três.
4. **Por que não precisa ser um exploit?**

---

## 8.2 Construindo o reproducer

⚠ **O processo, em cinco passos. E o passo 2 é o que exige pensar.**

| # | Passo | O que fazer |
|---|---|---|
| 1 | **Entenda a entrada** | Que formato o alvo processa? |
| 2 | **Construa a entrada que dispara** | ⚠ **Onde a suposição falha** |
| 3 | **Verifique o critério no N** | O N recusa? |
| 4 | **Verifique no N-1** | ⚠ **O N-1 processa?** |
| 5 | **Minimize** | Reduza ao essencial |

⚠ **O passo 2 é o que exige a leitura do módulo 3.** **Você precisa saber **qual campo** dispara a
diferença** — **e é o invariante que o patch passou a garantir.**

⚠ **A tabela do que cada tipo de patch exige como entrada:**

| Patch (forma, módulo 3) | Entrada que dispara |
|---|---|
| Guarda de faixa | ⚠ valor **acima** do limite |
| Condição corrigida | ⚠ valor **exatamente** na fronteira |
| Tipo alargado | valor que **não cabe** no tipo antigo |
| Validação | ⚠ dado **malformado** |
| Guarda movida | dado que **chega antes** da verificação |

⚠ **A linha da condição corrigida é a mais fina.** **Se o patch mudou `>` para `>=`, o valor que
dispara é **exatamente o limite** — `64` num buffer de 64.** **É off-by-one, e a entrada é precisa.**

⚠ **A tabela dos valores a testar, sempre:**

| Valor | Por que testar |
|---|---|
| **O limite exato** | ⚠ Off-by-one |
| **Limite + 1** | A fronteira |
| **Limite × 2** | A faixa |
| **0** | O caso vazio |
| **Máximo do tipo** | ⚠ Overflow |
| Máximo + 1 | Se possível |

⚠ **A regra escrita:**

> **O reproducer testa a FRONTEIRA, não um valor aleatório.** **Os três valores que importam são o
> limite, o limite + 1, e o máximo do tipo.**

⚠ **E é o mesmo princípio do curso de Fuzzing:** **a semente perto do limite é a que encontra.** **Um
valor aleatório testa o caso comum; a fronteira testa o caso que quebra.**

```bash
cd ~/patch-lab/mod08

echo "═══ 3. os valores de fronteira ═══"
echo
cat > fronteira.md <<'EOF'
# Os valores de fronteira

## Sempre teste
| Valor | Por quê |
|---|---|
| o limite exato | ⚠ off-by-one |
| limite + 1 | a fronteira |
| limite × 2 | a faixa |
| 0 | o caso vazio |
| máximo do tipo | ⚠ overflow |
| máximo + 1 | se possível |

## Por tipo de patch
| Forma (módulo 3) | Entrada que dispara |
|---|---|
| guarda de faixa | valor ACIMA do limite |
| condição corrigida | valor EXATAMENTE na fronteira |
| tipo alargado | valor que não cabe no tipo antigo |
| validação | dado malformado |
| guarda movida | dado que chega antes da verificação |

## O script de fronteira
```bash
# para um campo de 2 bytes:
for v in 0 1 63 64 65 1023 1024 1025 65535; do
    printf "0x%04x" $v | xxd -r -p > /tmp/entrada.bin
    ./alvo /tmp/entrada.bin
done
```

## ⚠ A regra
o reproducer testa a FRONTEIRA, não um valor aleatório.
✓ os três que importam: o limite, o limite + 1, o máximo do tipo.
EOF

cat fronteira.md

echo
echo "═══ 4. construindo o reproducer do par de treino ═══"
echo

cd ~/patch-lab/alvos/treino 2>/dev/null && {
    echo "  ── o alvo processa um cabeçalho: count (2 bytes) + dados ──"
    echo
    echo "  ── o patch adicionou: if (count > 1024) return -2 ──"
    echo "     ⚠ então a entrada que dispara tem count > 1024"
    echo

    python3 - <<'PY'
import struct
print("  ── os valores de fronteira ──")
print()
print(f"  {'count':>8}  {'esperado':<28}")
print("  " + "-"*40)
for v in [0, 1, 1023, 1024, 1025, 2048, 65535]:
    if v <= 1024:
        esp = "os dois processam"
    else:
        esp = "⚠ N-1 processa, N recusa"
    print(f"  {v:>8}  {esp:<28}")
print()
print("  ⚠ o ponto de virada é entre 1024 e 1025.")
print("     ✓ 1024 passa nos dois; 1025 só passa no N-1.")
PY

    echo
    echo "  ── gerando as entradas ──"
    mkdir -p /tmp/repro
    for v in 1024 1025; do
        python3 -c "
import struct,sys
v = $v
b = struct.pack('<H', v) + b'A' * 16
open('/tmp/repro/count_$v.bin','wb').write(b)
" 2>/dev/null
        printf '     /tmp/repro/count_%s.bin  (%s bytes)\n' "$v" "$(stat -c %s "/tmp/repro/count_$v.bin" 2>/dev/null)"
    done

    echo
    echo "  ── o teste de fronteira ──"
    for v in 1024 1025; do
        printf '     count=%s  N-1: %s   N: %s\n' "$v" \
            "$(./verso_antigo "$(cat /tmp/repro/count_$v.bin)" 2>&1 | head -1)" \
            "$(./verso_novo   "$(cat /tmp/repro/count_$v.bin)" 2>&1 | head -1)"
    done
    echo
    echo "  ⚠ e a diferença de comportamento é o REPRODUCER."
} || echo "  ⚠ rode o módulo 2"
```

⚠ **O teste de fronteira é o que constrói o reproducer.** **E o ponto de virada — entre 1024 e
1025 — é o que você procura.** **Encontrá-lo é reproduzir.**

⚠ **E é o mesmo raciocínio do curso de Fuzzing:** **o corpus com sementes **perto do limite** é o que
encontra bug.** **Aqui, a fronteira é derivada do patch** — **e não há procura às cegas.**

**Produza `fronteira.md`:**

| Valor | N-1 | N | Difere? |
|---|---|---|---|
| 1024 | | | |
| 1025 | | | |
| máximo | | | |

**Responda:**

1. **Qual o ponto de virada?** Como você encontrou?
2. **O N-1 processa** o que o N recusa?
3. **Qual valor testa off-by-one?** Por quê?
4. **Por que testar a fronteira** e não um valor aleatório?

---

## 8.3 Reproduzir versus explorar

⚠ **A linha, e ela é operacional. É o módulo 10 do curso de Pesquisa aplicado.**

| O ato | Reproduzir? | Explorar? |
|---|---|---|
| Rodar o binário **que você compilou** | ✓ | — |
| Rodar o binário **oficial, na sua máquina** | ✓ | — |
| ⚠ Mandar entrada a **instância em produção** | — | ⚠ **Ataque** |
| ⚠ Mandar entrada a **sistema de terceiro** | — | ⚠ **Ataque** |
| ⚠ Confirmar contra **cliente** sem autorização | — | ⚠ **Ataque** |
| Rodar contra **alvo CTF publicado** | ✓ | ✓ Se o CTF permite |

⚠ **A linha 5 é a tentação recorrente.** **"O binário é público, então o serviço também pode ser
testado"** — **não é verdade.** **O binário público é material de estudo; o serviço é de alguém.**

⚠ **E a linha 6 conecta com o curso de Exploit.** **Um CTF publicado permite os dois** — **porque é
o propósito dele.** **Mas o escopo do CTF é o escopo do CTF.**

⚠ **A tabela do que fazer quando você quer confirmar mais:**

| Você quer | Faça |
|---|---|
| Confirmar o mecanismo | ✓ **Reimplemente** (módulo 4) |
| Confirmar no alvo real | ✓ **Se for seu, CTF, ou autorizado** |
| Confirmar contra produção | ⚠ **NÃO.** Reporte e deixe o mantenedor |
| Mostrar o impacto | ✓ **Descreva**, não execute |
| Provar que é explorável | ⚠ **Não é o objetivo.** Declare que não verificou |

⚠ **A linha 5 é a resposta para a pergunta mais comum.** **"Como eu provo o impacto sem
explorar?"** — **você **descreve** o caminho, e **declara que não o executou.** **O mantenedor tem
o ambiente e a autoridade para confirmar.**

⚠ **A regra escrita, e é a do curso inteiro:**

> **Você reproduz no seu alvo, e reporta.** **O impacto, você descreve.** **A confirmação no
> sistema real é do mantenedor** — **porque é ele quem tem autoridade sobre ele.**

```bash
cd ~/patch-lab/mod08

echo "═══ 5. a linha: reproduzir vs. explorar ═══"
echo
cat > a-linha.md <<'EOF'
# Reproduzir vs. explorar

## Reproduzir (✓ este curso)
| Ato | Base |
|---|---|
| rodar o binário QUE EU COMPILEI | próprio |
| rodar o binário OFICIAL na MINHA máquina | uso normal |
| rodar contra alvo CTF publicado | o propósito do CTF |
| reimplementar o trecho | código próprio |
| descrever o impacto | ⚠ **sem executar** |

## Explorar (⚠ não é este curso)
| Ato | Por quê é outra coisa |
|---|---|
| mandar entrada a instância em produção | é sistema de alguém |
| mandar entrada a sistema de terceiro | é ataque |
| confirmar contra cliente sem autorização | idem |
| usar credencial encontrada | ⚠ crime |

## Quando você quer confirmar MAIS
| Você quer | Faça |
|---|---|
| o mecanismo | reimplemente |
| no alvo real | só se for seu/CTF/autorizado |
| contra produção | ⚠ **NÃO** — reporte |
| mostrar o impacto | ✓ descreva |
| provar que é explorável | ⚠ não é o objetivo |

## ⚠ A REGRA
você reproduz no SEU alvo, e reporta.
o impacto, você DESCREVE.
a confirmação no sistema real é do MANTENEDOR —
porque é ele quem tem autoridade sobre ele.

## E a linha em uma frase
"reproduzir é confirmar a diferença; explorar é obter controle."
EOF

cat a-linha.md

echo
echo "═══ 6. o relatório do reproducer ═══"
echo
cat > relatorio-reproducer.md <<'EOF'
# Relatório do reproducer

## 1. O alvo
| Item | Valor |
|---|---|
| Binário | |
| Versão | |
| SHA-256 | |
| Origem | |

## 2. A entrada
| Item | Valor |
|---|---|
| Formato | |
| Conteúdo | |
| Tamanho | |
| Como gerar | |

## 3. ⚠ O critério
| Item | Valor |
|---|---|
| O que o N-1 faz | |
| O que o N faz | |
| **Como se sabe que reproduziu** | |

## 4. O teste de fronteira
| Valor | N-1 | N | Difere? |
|---|---|---|---|
| limite | | | |
| limite + 1 | | | |
| máximo do tipo | | | |

## 5. Determinismo
| Item | Valor |
|---|---|
| Reproduz sempre? | |
| ⚠ Se não, o que varia | |

## 6. O ambiente
| Item | Valor |
|---|---|
| SO / arquitetura | |
| Dependências | |
| Data | |

## 7. O que eu NÃO fiz
⚠ obrigatório:
- não mandei entrada a instância de terceiro
- não construí exploit
- não confirmei contra produção
- não verifiquei a explorabilidade

## 8. O que o mantenedor precisa confirmar
| # | Item |
|---|---|
| 1 | o caminho é alcançável em produção? |
| 2 | outra camada valida? |
EOF

cat relatorio-reproducer.md
```

⚠ **A seção 7 é a que fecha o módulo.** **Ela declara o que você **não** fez** — **e é o que torna
o relatório defensável.** **É a mesma disciplina do módulo 10 do curso de Pesquisa.**

⚠ **E a seção 8 é o que você pede.** **Duas perguntas objetivas ao mantenedor** — **e ele responde
no ambiente dele, com autoridade que você não tem.**

**Produza `linha.md`:**

| Ato | Reproduzir ou explorar? |
|---|---|
| Binário que você compilou | |
| Binário oficial na sua máquina | |
| Instância em produção | |
| Alvo CTF | |

**Responda:**

1. **Qual ato é a linha?** Por que é tentador?
2. **Como provar o impacto** sem explorar?
3. **O que a seção 7 do relatório declara?**
4. **A linha em uma frase** — escreva.

---

## 8.4 LAB — O reproducer completo

**Duração:** 150 min

### Passo 1 — Construa o reproducer (50 min)

⚠ **Use o par de treino, ou um CVE real com par.**

```bash
cd ~/patch-lab/mod08

echo "═══ CONSTRUINDO O REPRODUCER ═══"
echo
cat <<'EXPL'
  ── O PROCESSO ──

     1. ENTENDA A ENTRADA
        · que formato o alvo processa?
        · qual campo o patch valida?

     2. CONSTRUA A ENTRADA QUE DISPARA
        ⚠ o invariante do patch diz QUAL campo
        ✓ e a fronteira diz QUAL valor

     3. VERIFIQUE NO N
        · o N recusa? (✓ o patch funciona)

     4. VERIFIQUE NO N-1
        ⚠ o N-1 processa? (✓ o achado é real)

     5. MINIMIZE
        · reduza ao essencial
EOF

cd ~/patch-lab/alvos/treino 2>/dev/null && {
    echo
    echo "  ── 1. a entrada: o alvo recebe um cabeçalho de 6 bytes ──"
    echo "     struct { uint16_t count; uint32_t total; }"
    echo "     + os dados"
    echo
    echo "  ── 2. o campo que o patch valida é `count` ──"
    echo "     ⚠ a fronteira: 1024 (MAX_ITEMS)"
    echo

    mkdir -p /tmp/repro
    echo "  ── 3 e 4. gerando e testando os valores de fronteira ──"
    printf '     %-8s %-30s %-30s %s\n' "count" "N-1" "N" "difere?"
    printf '     %-8s %-30s %-30s %s\n' "─────" "───" "─" "───────"

    for v in 1 1024 1025 2048 65535; do
        python3 -c "
import struct,sys
open('/tmp/repro/e_$v','wb').write(struct.pack('<H', $v) + b'\x41'*32)
" 2>/dev/null

        r1=$(./verso_antigo "$(cat /tmp/repro/e_$v)" 2>&1 | head -1)
        r2=$(./verso_novo   "$(cat /tmp/repro/e_$v)" 2>&1 | head -1)
        d=$([ "$r1" != "$r2" ] && echo "⚠ SIM" || echo "não")
        printf '     %-8s %-30s %-30s %s\n' "$v" "${r1:0:28}" "${r2:0:28}" "$d"
    done

    echo
    echo "  ✓ o ponto de virada está entre 1024 e 1025"
    echo

    echo "  ── 5. minimizando ──"
    echo "     ⚠ o menor input que ainda dispara:"
    echo "        count = 1025  (2 bytes)  +  os dados que ele lê"
    printf '        tamanho atual: %s bytes em /tmp/repro/e_1025\n' "$(stat -c %s /tmp/repro/e_1025 2>/dev/null)"

    cat > /tmp/repro/README.md <<'EOF'
# Reproducer

## Alvo
| Item | Valor |
|---|---|
| Binário N-1 | verso_antigo |
| Binário N | verso_novo |
| Hash N-1 | (calcular) |
| Hash N | (calcular) |

## Entrada
| Item | Valor |
|---|---|
| Formato | cabeçalho de 6 bytes + dados |
| Conteúdo | count = 1025, total = 0, + 32 bytes de 0x41 |
| Tamanho | 38 bytes |

## ⚠ Critério
| Item | Valor |
|---|---|
| N-1 faz | processa (retorna o total) |
| N faz | recusa (retorna -2) |
| Como se sabe | a SAÍDA difere entre as versões |

## Teste de fronteira
| count | N-1 | N | difere? |
|---|---|---|---|
| 1024 | processa | processa | não |
| 1025 | processa | recusa | ⚠ SIM |

## O que NÃO foi feito
- não construí exploit
- não testei contra terceiro
- não confirmei contra produção
EOF

    echo
    echo "  ✓ reproducer minimizado: 38 bytes"
    cat /tmp/repro/README.md | head -25
} || echo "  ⚠ rode o módulo 2"
```

⚠ **A minimização é o último passo, não o primeiro.** **Você constrói o reproducer funcional —
**depois** reduz.** **E 38 bytes é convincente.**

⚠ **E o `README.md` com as seções do §8.1 é o reproducer como entregável.** **Ele tem as quatro
partes, e declara o que **não** foi feito.**

**Produza `reproducer-construido.md`:**

| count | N-1 | N | Difere? |
|---|---|---|---|
| 1024 | | | |
| 1025 | | | |
| 65535 | | | |

**Responda:**

1. **Qual o ponto de virada?**
2. **Qual o tamanho mínimo** que ainda dispara?
3. **O critério está escrito?** Como se sabe que reproduziu?
4. **O README declara o que não foi feito?**

### Passo 2 — Registre a evidência (50 min)

⚠ **O reproducer é evidência. E evidência tem formato.**

```bash
cd ~/patch-lab/mod08

echo "═══ REGISTRANDO A EVIDÊNCIA ═══"
echo

cd ~/patch-lab/alvos/treino 2>/dev/null && {
    echo "  ── calculando os hashes ──"
    for f in verso_antigo verso_novo; do
        printf '     %-16s %s\n' "$f" "$(sha256sum "$f" 2>/dev/null | awk '{print $1}')"
    done
    echo

    echo "  ── a evidência completa ──"
    echo "     ⚠ comando + saída literal, como o módulo 8 do Pesquisa exige"
    echo

    COMMAND="printf '\x01\x04\x00\x00\x00\x00\x00' + 32 bytes | ./verso_antigo   (e ./verso_novo)"

    echo "     ── o comando ──"
    echo "        ./verso_antigo /tmp/repro/e_1025   →  $(./verso_antigo "$(cat /tmp/repro/e_1025)" 2>&1 | head -1)"
    echo "        ./verso_novo   /tmp/repro/e_1025   →  $(./verso_novo   "$(cat /tmp/repro/e_1025)" 2>&1 | head -1)"
    echo
    echo "     ── e a diferença de saída é a PROVA ──"
}

cat > evidencia.md <<'EOF'
# Evidência do reproducer

## 1. Comando literal
```
./verso_antigo /tmp/repro/e_1025
./verso_novo   /tmp/repro/e_1025
```

## 2. Saída literal
```
N-1: 
N  : 
```

## 3. Os binários
| Binário | SHA-256 |
|---|---|
| N-1 | |
| N | |

## 4. A entrada
| Item | Valor |
|---|---|
| Geração | `python3 -c "import struct; open(...,'wb').write(struct.pack('<H',1025)+b'A'*32)"` |
| Conteúdo | count=1025 + 32 bytes |
| Tamanho | 38 bytes |

## 5. Data e ambiente
| Item | Valor |
|---|---|
| Data | |
| SO / arquitetura | |

## ⚠ 6. O que isso prova
a versão N-1 processa a entrada e a versão N a recusa.
✓ o achado é REAL e a correção muda o comportamento.

## ⚠ 7. O que isso NÃO prova
- que é explorável
- o impacto real
- que outros caminhos não existem
EOF

cat evidencia.md
```

⚠ **A evidência tem **comando** e **saída** — é o módulo 8 do curso de Pesquisa.** **A diferença de
saída é a prova** — **e o hash prova **qual** binário você usou.**

⚠ **E a seção 7 declara o que não prova.** **É o que torna o reproducer um documento honesto** —
**e não uma alegação de exploit.**

**Produza `evidencia.md`:**

| Item | Valor |
|---|---|
| Comando | |
| Saída N-1 | |
| Saída N | |
| SHA-256 | |

**Responda:**

1. **A evidência tem comando e saída literais?**
2. **O hash está registrado?** Por quê?
3. **O que a seção 6 prova?**
4. **O que a seção 7 declara?**

### Passo 3 — A declaração e o relatório (50 min)

Produza `relatorio-1day.md`:

```markdown
# Reprodução do 1-day — relatório

## 1. Identificação
| Item | Valor |
|---|---|
| CVE / exercício | |
| Componente | |
| CWE | |
| Invariante violado | |

## 2. O par e a proveniência
| Item | N-1 | N |
|---|---|---|
| Versão | | |
| SHA-256 | | |
| URL | | |
| Compilador | | |

## 3. Como eu localizei (módulo 7)
| Técnica | Resultado |
|---|---|
| assinatura | |
| fluxo | |
| componente | |

## 4. O reproducer
| Parte | Valor |
|---|---|
| Alvo | |
| Entrada | |
| **Critério** | |
| Ambiente | |

## 5. O teste de fronteira
| Valor | N-1 | N | Difere? |
|---|---|---|---|
| limite | | | |
| limite + 1 | | | |

## 6. Determinismo
| Item | Valor |
|---|---|
| reproduz sempre? | |
| se não, o que varia | |

## 7. O que isso prova
| Item | Valor |
|---|---|
| a correção muda o comportamento? | |
| o achado é real? | |
| a leitura do diff estava certa? | |

## 8. O que eu NÃO fiz   ⚠ OBRIGATÓRIO
- [ ] não construí exploit
- [ ] não mandei entrada a instância de terceiro
- [ ] não confirmei contra produção
- [ ] não verifiquei a explorabilidade
- [ ] não calculei a severidade

## 9. O que o mantenedor precisa confirmar
| # | Item |
|---|---|
| 1 | o caminho é alcançável em produção? |
| 2 | outra camada valida? |

## 10. O padrão, para a variante (módulo 10)
"[sem nomes]"
```

**Produza `relatorio.md`:**

| Seção | Preenchida |
|---|---|
| Reproducer | |
| Teste de fronteira | |
| O que prova | |
| **O que NÃO fiz** | |
| Padrão | |

**Responda:**

1. **Quantas caixas da seção 8 estão marcadas?**
2. **O que prova** a reprodução?
3. **O que o mantenedor precisa confirmar?**
4. **O padrão, sem nomes** — escreva.
5. **O relatório declara que não é exploit?** Onde?

### Critérios de aceitação

- `reproducer.md` com as **quatro** partes obrigatórias.
- Você explicou **qual parte a maioria esquece**.
- Você explicou **o que o reproducer prova e o que não prova**.
- `fronteira.md` com os **seis** valores sempre testados.
- Você identificou **o ponto de virada** no par de treino.
- Você explicou **por que testar a fronteira** e não um valor aleatório.
- `a-linha.md` com a distinção **reproduzir/explorar**.
- Você explicou **como provar o impacto** sem explorar.
- Você escreveu **a linha em uma frase**.
- O reproducer **construído e testado** no par de treino.
- Você mediu o **tamanho mínimo** que ainda dispara.
- `evidencia.md` com **comando e saída literais** e os **hashes**.
- Você explicou **por que o hash importa**.
- `relatorio-1day.md` com as **dez** seções.
- **Todas as caixas** da seção 8 marcadas.
- Você escreveu o **padrão sem nomes**.
- ⚠ **Nenhum alvo de terceiro.** Reprodução no alvo próprio.

---

## Avaliação

1. **O que é reproduzir?** E o que não é?
2. **Cite as quatro partes** do reproducer.
3. **Qual parte a maioria esquece?** Por quê?
4. **O que o reproducer prova?** Cite quatro.
5. **O que ele não prova?** Cite quatro.
6. **Por que não precisa ser exploit?**
7. **Cite os cinco passos** de construção.
8. **Onde a leitura do módulo 3 entra?**
9. **Cite os seis valores de fronteira.**
10. **Por que testar a fronteira** e não um aleatório?
11. **Qual valor testa off-by-one?** Por quê?
12. **O que fazer se o reproducer não for determinístico?**
13. **Cite a linha: o que é reproduzir e o que é explorar.**
14. **Qual ato é a linha?** Por que é tentador?
15. **Como provar o impacto** sem explorar?
16. **O que a seção "não fiz"** declara? Por que ela importa?
17. **Por que o hash do binário importa?**
18. **O que o mantenedor confirma** que você não pode?
19. **Por que a minimização é o último passo?**
20. **O que o reproducer é**, em uma frase?

---

**Próximo:** [Módulo 9 — Silent patch](modulo-09.md)
