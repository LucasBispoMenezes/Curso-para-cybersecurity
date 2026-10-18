# Módulo 10 — O Detector que Discorda

**Carga:** 2 horas (45 min teoria · 1h15 lab)
**Pré-requisitos:** Módulos 1 a 9 · HTTP Smuggling (módulo 10)

---

## Objetivos

1. Ver o **WAF por dentro** — as regras que ele tem, e por que elas falham.
2. Reconhecer o detector **como uma camada a mais** — e o que isso implica.
3. Entender o caso **`WAFFLED`** — 120+ exploits, cinco produtos, um mecanismo.
4. **Medir** a assimetria entre o que o WAF compara e o que o backend processa.
5. Saber o que a detecção **pode** fazer quando a camada é a errada.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O detector é uma camada a mais.** **E uma camada a mais é uma divergência a mais** — **não uma
> divergência resolvida.**

⚠ **E é a conclusão que o curso anterior deixou, agora com o mecanismo por dentro:** **o WAF compara
uma forma normalizada e entrega a original.** **E nenhuma regra corrige isso, porque o problema
não está na regra.**

⚠ **A tese:**

> **A detecção assinatura por assinatura é limitada pela camada onde ela roda.** **Um WAF
> perfeito, na camada errada, não detecta o que acontece na de baixo.**

⚠ **A tabela das regras que o WAF tem, e do que cada uma pressupõe:**

| Tipo de regra | Pressupõe | ⚠ Falha quando |
|---|---|---|
| **Assinatura de payload** | Que a forma é estável | ⚠ **A evasão muda a forma** |
| **Validação de protocolo** | Que a spec é seguida | ⚠ **Nem todos seguem** |
| **Rate limiting** | Que o ataque é volumoso | ⚠ **Não é** |
| **Reputação** | Que a origem é conhecida | ⚠ **Origem nova** |
| ⚠ **Normalização** | ⚠ **Que ela é a mesma do backend** | ⚠⚠ **Nunca é** |

⚠ **A última linha é o módulo 4 inteiro.** **A premissa da normalização é falsa por construção** —
**porque o WAF e o backend são componentes diferentes, com decisões diferentes.**

---

## 10.1 O WAF por dentro

⚠ **O que o WAF faz, e onde cada etapa pode divergir.**

| Etapa | O que faz | ⚠ Divergência |
|---|---|---|
| 1. **Parsear** | Lê a requisição | ⚠ **A regra de framing** |
| 2. **Decodificar** | URL, unicode | ⚠ **Quantas vezes** |
| 3. **Normalizar** | Case, espaços | ⚠ **A ordem** |
| 4. **Comparar** | Assinatura | ⚠ A assinatura em si |
| 5. ⚠ **Repassar** | ⚠ **Envia ao backend** | ⚠⚠ **O ORIGINAL, não o normalizado** |

⚠ **A etapa 5 é a que o curso anterior demonstrou.** **O WAF compara na etapa 4 e entrega na 5** —
**e é entre as duas que o payload vive.**

⚠ **E a tabela do que cada etapa **vê**:**

| Etapa | O que o WAF vê |
|---|---|
| 1. Parse | ⚠ **A forma crua** |
| 2. Decode | A forma decodificada **uma vez** |
| 3. Normalize | A forma normalizada **dele** |
| 4. Compare | O que casou ou não |
| ⚠ 5. Repassar | ⚠ **NÃO vê — só entrega** |

⚠ **A linha 5 é o ponto cego estrutural.** **O WAF não vê o que ele entrega** — **ele só sabe que
repassou.**

⚠ **A regra escrita:**

> **O WAF compara o que ele entendeu e entrega o que ele recebeu.** **E a distância entre as duas
> coisas é o espaço da evasão.** **Não há regra que feche essa distância** — **só a remoção da
> camada, ou a normalização antes do repasse.**

```bash
mkdir -p ~/detect-lab/mod10 && cd ~/detect-lab/mod10

echo "═══ 1. o WAF por dentro ═══"
echo
cat > waf.md <<'EOF'
# O WAF por dentro

| Etapa | O que faz | Divergência |
|---|---|---|
| 1 PARSEAR | lê a requisição | ⚠ a regra de FRAMING |
| 2 DECODIFICAR | URL, unicode | ⚠ QUANTAS vezes |
| 3 NORMALIZAR | case, espaços | ⚠ a ORDEM |
| 4 COMPARAR | assinatura | ⚠ a assinatura em si |
| 5 ⚠ REPASSAR | ⚠ envia ao backend | ⚠⚠ O ORIGINAL, não o normalizado |

## O que cada etapa VÊ
| Etapa | O WAF vê |
|---|---|
| 1 parse | a forma CRUA |
| 2 decode | a forma decodificada UMA vez |
| 3 normalize | a forma normalizada DELE |
| 4 compare | o que casou ou não |
| ⚠ 5 repassar | ⚠ **NÃO VÊ — só entrega** |

## ⚠ a linha 5 é o ponto cego ESTRUTURAL
o WAF não vê o que ele ENTREGA.
ele só sabe que REPASSOU.

## ⚠ A REGRA
o WAF compara o que ele ENTENDEU
e entrega o que ele RECEBEU.
e a distância entre as duas coisas é o ESPAÇO DA EVASÃO.
⚠ não há regra que feche essa distância —
   só a REMOÇÃO da camada, ou a NORMALIZAÇÃO antes do repasse.
EOF

cat waf.md

echo
echo "═══ 2. o caso WAFFLED ═══"
echo
cat <<'EXPL'
  ── O QUE ELE FEZ ──
     comparou o comportamento de 5 WAFs com o dos
     servidores que eles protegem.

  ── O RESULTADO ──
     ⚠ 120+ exploits
     ⚠ contra 5 produtos comerciais
     ⚠ todos por PARSER DIFFERENTIAL

  ── E O MECANISMO É SEMPRE O MESMO ──
     o WAF normaliza de um jeito.
     o backend, de outro.
     ⚠ e o payload é construído para a diferença.

  ── POR QUE ISSO NÃO SE CORRIGE COM REGRA ──
     · o WAF já tem regras — e elas estão CERTAS
     · ⚠ o problema é a CAMADA, não a regra
     · para corrigir, o WAF teria que NORMALIZAR antes de repassar
     ✓ e isso custa performance, e quebra clientes legados
EXPL
```

⚠ **As cinco etapas são o mapa.** **E a etapa 5 é a que o curso anterior demonstrou** — **com
número.**

⚠ **E o `WAFFLED` é o argumento empírico:** **120+ exploits, cinco produtos, um mecanismo.** **A
tabela de regras não evitou.**

**Produza `waf.md`:**

| Etapa | O que faz | Divergência |
|---|---|---|
| 1 | | |
| 5 | | |

**Responda:**

1. **Qual etapa é o ponto cego?** Por que é estrutural?
2. **O que o WAF compara?** E o que ele entrega?
3. **Por que o `WAFFLED` não se evita com mais regras?
4. **O que corrigiria de fato?

---

## 10.2 Medindo a assimetria

⚠ **O experimento: **o mesmo payload, o WAF e o backend, e o que cada um registra.**

| # | O que medir | Como |
|---|---|---|
| 1 | O que o WAF **viu** | O log dele |
| 2 | ⚠ **O que o backend viu** | ⚠ **O log dele** |
| 3 | ⚠ **A diferença** | ⚠ **Comparar os dois** |
| 4 | O veredito de cada | Bloqueou? Executou? |

⚠ **A comparação dos dois logs é o instrumento.** **E a diferença é a assimetria** — **em bytes, não
em opinião.**

⚠ **A tabela do que a comparação revela, tipicamente:**

| O que o WAF viu | O que o backend viu | ⚠ Significa |
|---|---|---|
| `%3Cscript%3E` | `<script>` | ⚠ **Dupla decodificação** |
| `"payload inofensivo"` | `"payload ativo"` | ⚠ **Divergência de forma** |
| A requisição 1 | ⚠ **Requisição 1 + 2** | ⚠⚠ **Desync** |
| Header normal | ⚠ **Header diferente** | ⚠ **A camada mudou** |

⚠ **A terceira linha é o smuggling** — **e a diferença não é de forma, é de **número**.** **O WAF
contou uma; o backend, duas.**

⚠ **A regra escrita:**

> **A assimetria se mede comparando dois logs.** **Não há outra forma** — **porque a assimetria é,
> por definição, a diferença entre o que duas camadas registram.**

```bash
cd ~/detect-lab/mod10

echo "═══ 3. medindo a assimetria ═══"
echo
cat > assimetria.md <<'EOF'
# Medindo a assimetria

| # | O que medir | Como |
|---|---|---|
| 1 | o que o WAF VIU | o log dele |
| 2 | ⚠ o que o BACKEND viu | ⚠ o log dele |
| 3 | ⚠ A DIFERENÇA | ⚠ comparar os dois |
| 4 | o veredito de cada | bloqueou? executou? |

## O que a comparação revela
| WAF viu | backend viu | Significa |
|---|---|---|
| `%3Cscript%3E` | `<script>` | ⚠ dupla decodificação |
| "inofensivo" | "ativo" | ⚠ divergência de FORMA |
| a requisição 1 | ⚠ requisição 1 E 2 | ⚠⚠ DESYNC |
| header normal | ⚠ header DIFERENTE | ⚠ a camada MUDOU |

## ⚠ a terceira linha é o smuggling
e a diferença NÃO é de forma — é de NÚMERO.
o WAF contou UMA; o backend, DUAS.

## ⚠ A REGRA
a assimetria se mede COMPARANDO DOIS LOGS.
não há outra forma —
porque a assimetria É, por definição,
a diferença entre o que duas camadas REGISTRAM.
EOF

cat assimetria.md

echo
echo "═══ 4. o comparador de camadas ═══"
echo
cat > compara-camadas.py <<'PY'
#!/usr/bin/env python3
"""
compara-camadas.py — mede a ASSIMETRIA entre o WAF e o backend.

⚠ DIDÁTICO e LOCAL. compara os SEUS dois logs.
"""
import sys, os, re
from collections import Counter

LOG_WAF = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/smuggle-lab/evidencia/cache.log")
LOG_BACK = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser(
    "~/smuggle-lab/evidencia/backend-cl.log")


def le(p):
    try:
        return open(p, errors="replace").read()
    except FileNotFoundError:
        return ""


def conta_eventos(txt):
    return len(re.findall(r"═══ (?:requisição|conexão|CACHE)", txt))


def paths(txt):
    return Counter(re.findall(r"PATH: (\S+)", txt))


def main():
    w = le(LOG_WAF)
    b = le(LOG_BACK)

    print("═══ ASSIMETRIA ENTRE CAMADAS ═══")
    print()
    print(f"  WAF     : {os.path.basename(LOG_WAF)}")
    print(f"  backend : {os.path.basename(LOG_BACK)}")
    print()

    nw, nb = conta_eventos(w), conta_eventos(b)
    print(f"  eventos no WAF     : {nw}")
    print(f"  eventos no backend : {nb}")
    print(f"  ⚠ diferença        : {nb - nw}")
    print()

    pw, pb = paths(w), paths(b)
    so_backend = set(pb) - set(pw)

    if so_backend:
        print("  ⚠ paths que o BACKEND viu e o WAF NÃO:")
        for p in sorted(so_backend)[:10]:
            print(f"     {p}")
        print()
        print("  ✓ ESTES são a assimetria — não uma opinião.")
    else:
        print("  · nenhum path exclusivo do backend detectado")

    print()
    print("  ═══ COMO LER ═══")
    print("  · diferença de EVENTOS > 0  → ⚠ assimetria de CONTAGEM (desync)")
    print("  · path só no backend        → ⚠ assimetria de FORMA")
    print("  · nenhuma das duas          → as camadas concordam AQUI")
    print()
    print("  ⚠ e a assimetria é a SUPERFÍCIE DA EVASÃO.")
    print("     nenhum serviço de terceiro envolvido.")


if __name__ == "__main__":
    main()
PY

chmod +x compara-camadas.py
echo "  ── pronto ──"
echo "     python3 ~/detect-lab/mod10/compara-camadas.py"
```

⚠ **O comparador é o instrumento.** **E ele mede a assimetria em duas dimensões:** **contagem de
eventos** (desync) e **paths exclusivos** (forma).

⚠ **E a distinção importa:** **contagem diferente é desync; path exclusivo é diferença de forma** —
**e cada uma pede uma contramedida diferente.**

**Produza `assimetria.md`:**

| Dimensão | WAF | Backend | Diferença |
|---|---|---|---|
| Eventos | | | |
| Paths exclusivos | | | |

**Responda:**

1. **Qual dimensão mostrou assimetria?
2. **Contagem ou forma?** O que cada uma significa?
3. **Qual path o backend viu e o WAF não?
4. **Por que comparar dois logs é o único jeito?

---

## 10.3 O que a detecção pode fazer

⚠ **Se a camada é a errada, o que sobra? Três coisas — e a terceira é a mais eficaz.**

| # | Ação | O que resolve | ⚠ Custo |
|---|---|---|---|
| 1 | **Adicionar regra** | ⚠ Nada — o problema não é regra | ✓ Baixo |
| 2 | ⚠ **Correlacionar os logs** | ⚠ **Detecta o efeito** | ⚠ Alto |
| 3 | ⚠⚠ **Instrumentar o backend** | ⚠⚠ **Detecta a ação** | ⚠ Alto |

⚠ **A primeira linha é a tentação.** **"O WAF falhou — vamos escrever mais regras"** — **e é
exatamente o que o módulo 9 mostrou que não funciona** para as famílias 3 e 6.

⚠ **A segunda é o meio-termo.** **Correlacionar o log do WAF com o do backend detecta a
**divergência** — **porque a divergência é a diferença.**

⚠ **A terceira é a que o módulo 3 recomendou:** **instrumentar o backend é detectar a **ação** — **e
a ação é invariante.**

⚠ **A tabela do que cada ação pega:**

| Ação | Pega a forma? | Pega a ação? | Pega o framing? |
|---|---|---|---|
| Mais regras | ⚠ Sim | Não | Não |
| ⚠ Correlacionar | Sim | ⚠ Parcial | ⚠ **Sim** |
| ⚠⚠ Instrumentar | Sim | ⚠⚠ **Sim** | Sim |

⚠ **A regra escrita:**

> **Quando o problema é a camada, a solução é outra camada.** **E a camada certa é a que vê o
> efeito** — **porque o efeito não muda com a evasão.**

```bash
cd ~/detect-lab/mod10

echo "═══ 5. o que a detecção pode fazer ═══"
echo
cat > o-que-fazer.md <<'EOF'
# O que a detecção pode fazer

| # | Ação | O que resolve | Custo |
|---|---|---|---|
| 1 | adicionar REGRA | ⚠ NADA — o problema não é regra | ✓ baixo |
| 2 | ⚠ CORRELACIONAR os logs | ⚠ detecta o EFEITO | ⚠ alto |
| 3 | ⚠⚠ INSTRUMENTAR o backend | ⚠⚠ detecta a AÇÃO | ⚠ alto |

## ⚠ a primeira linha é a TENTAÇÃO
"o WAF falhou — vamos escrever MAIS regras".
e é exatamente o que o módulo 9 mostrou que NÃO funciona
para as famílias 3 e 6.

## O que cada ação pega
| Ação | forma? | ação? | framing? |
|---|---|---|---|
| mais regras | ⚠ sim | não | não |
| ⚠ correlacionar | sim | ⚠ parcial | ⚠ SIM |
| ⚠⚠ instrumentar | sim | ⚠⚠ SIM | sim |

## ⚠ A REGRA
quando o problema é a CAMADA, a solução é OUTRA CAMADA.
e a camada certa é a que VÊ O EFEITO —
porque o EFEITO não muda com a evasão.
EOF

cat o-que-fazer.md
```

⚠ **A tabela das três ações é o entregável.** **E a distinção "questão de camada × questão de
regra" é o que separa o ajuste útil do trabalho perdido.**

⚠ **E a nota do efeito fecha o curso:** **a evasão muda a forma; o efeito, não** — **e é por isso
que a detecção viável mora perto do efeito.**

**Produza `o-que-fazer.md`:**

| Ação | Pega a forma? | Pega a ação? |
|---|---|---|
| Mais regras | | |
| Correlacionar | | |
| Instrumentar | | |

**Responda:**

1. **Qual ação é a tentação?** Por que não funciona?
2. **O que correlacionar pega que a regra não pega?
3. **Por que instrumentar o backend é o mais eficaz?
4. **Por que "o efeito não muda com a evasão"?

---

## 10.4 LAB — A assimetria do seu lab

**Duração:** 75 min

### Passo 1 — Monte a cadeia com o WAF (40 min)

⚠ **O WAF didático do curso anterior, e a medição da assimetria.**

```bash
cd ~/detect-lab/mod10

echo "═══ MONTANDO A CADEIA COM O WAF ═══"
echo
cat <<'EXPL'
  ── O QUE REUSAR ──

     do curso anterior (HTTP Smuggling, módulo 8):
       · waf_didatico.py      (normaliza UMA vez)
       · backend_host.py      (decodifica duas, loga)

     ⚠ e a cadeia: cliente → WAF → backend

  ── O QUE VOCÊ VAI MEDIR ──
     · o que o WAF VÊ
     · ⚠ o que o BACKEND vê
     · a DIFERENÇA

  ── E O PAYLOAD QUE REVELA ──
     um com DUPLA codificação —
     ⚠ é a assimetria mais fácil de demonstrar.
EXPL

cat > assimetria-do-lab.sh <<'SCRIPT'
#!/usr/bin/env bash
# assimetria-do-lab.sh — demonstra a assimetria WAF × backend
set -uo pipefail

WAF_PORT="${1:-9001}"
BACK_PORT="${2:-9000}"

echo "═══════════ ASSIMETRIA WAF × BACKEND ═══════════"
echo
echo "  WAF     : 127.0.0.1:${WAF_PORT}"
echo "  backend : 127.0.0.1:${BACK_PORT}"
echo "  ⚠ tudo LOCAL. nenhum serviço de terceiro."
echo

# ── o payload com dupla codificação ──
PAYLOAD='/%253Cscript%253E'

echo "  ── o que vou mandar ──"
printf '     %s\n' "$PAYLOAD"
echo "     ⚠ a assinatura do WAF procura '<script' na forma crua"

# ── manda pelo WAF ──
python3 - "$WAF_PORT" "$PAYLOAD" <<'PY'
import socket, sys
port, path = int(sys.argv[1]), sys.argv[2]
req = f"GET {path} HTTP/1.1\r\nHost: localhost\r\n\r\n".encode()
try:
    with socket.create_connection(("127.0.0.1", port), timeout=4) as s:
        s.sendall(req)
        s.settimeout(2)
        r = b""
        try:
            while True:
                d = s.recv(4096)
                if not d: break
                r += d
        except socket.timeout:
            pass
    if r:
        print(f"  ── resposta do WAF ──")
        print(f"     {r.split(b'\\r\\n')[0].decode(errors='replace')}")
        if b"403" in r[:20]:
            print("     ✓ o WAF BLOQUEOU")
        else:
            print("     ⚠ o WAF DEIXOU PASSAR")
    else:
        print("  · sem resposta do WAF")
except Exception as e:
    print(f"  ⚠ {type(e).__name__} — o WAF está no ar?")
PY

echo
echo "  ── agora compare os DOIS logs ──"
echo "     python3 ~/detect-lab/mod10/compara-camadas.py \\"
echo "         ~/smuggle-lab/evidencia/cache.log \\"
echo "         ~/smuggle-lab/evidencia/backend-host.log"
SCRIPT

chmod +x assimetria-do-lab.sh

echo "  ── pronto ──"
echo "     bash ~/detect-lab/mod10/assimetria-do-lab.sh 9001 9000"
```

⚠ **O script demonstra a assimetria com o payload de dupla codificação** — **o mais fácil de
mostrar.**

⚠ **E a nota do "WAF procura na forma crua" é o mecanismo:** **ele não reconhece `%253C`, e deixa
passar.**

**Produza `cadeia-waf.md`:**

| Camada | Porta | Normaliza |
|---|---|---|
| WAF | | |
| Backend | | |

**Responda:**

1. **O WAF bloqueou o payload de dupla codificação?** Por quê?
2. **O que o backend fez?** Ele decodificou duas vezes?
3. **A assimetria apareceu nos dois logs?
4. **Qual das três ações resolveria isso?** Por quê?

### Passo 2 — Documente a assimetria (35 min)

Produza `caderno/PD-010.md`:

```markdown
# PD-010 — o detector que discorda

**Data:** ____

## 1. A cadeia
| Camada | O que faz | Porta |
|---|---|---|
| WAF | | |
| backend | | |

## 2. As cinco etapas do WAF
| Etapa | O que ele faz aqui |
|---|---|
| parsear | |
| decodificar | |
| normalizar | |
| comparar | |
| ⚠ repassar | ⚠ |

## 3. A assimetria medida
| Dimensão | WAF | backend | ⚠ Diferença |
|---|---|---|---|
| eventos | | | |
| paths exclusivos | | | |

## 4. A evidência literal
```
[log do WAF]
```
```
[log do backend]
```

## 5. ⚠ O veredito
| Item | Valor |
|---|---|
| o WAF detectou? | |
| o backend executou? | |
| ⚠ houve assimetria? | |

## 6. As três ações
| # | Ação | Resolveria? | Custo |
|---|---|---|---|
| 1 | mais regra | | |
| 2 | correlacionar logs | | |
| 3 | instrumentar o backend | | |

## 7. A lacuna
| Item | Valor |
|---|---|
| é lacuna de | detecção / instrumentação |
| quem resolve | |

## 8. ⚠ O que eu NÃO fiz
- [ ] não testei contra WAF de terceiro
- [ ] não usei o bypass contra alvo real
- [ ] não publiquei nada
- [ ] não testei CDN ou proxy de produção

## 9. O que NÃO foi verificado
⚠ mínimo 3
```

Produza `relatorio-assimetria.md`:

```markdown
# Relatório — a assimetria entre camadas

## 1. A cadeia
| Camada | Produto | Versão | O que faz |
|---|---|---|---|
| | | | |

## 2. O payload
```
[hex ou repr]
```

## 3. A medida
| Dimensão | WAF | backend | Diferença |
|---|---|---|---|
| eventos | | | |
| paths | | | |

## 4. ⚠ A assimetria
| Item | Valor |
|---|---|
| de contagem? | |
| de forma? | |
| a evidência | |

## 5. O veredito de cada camada
| Camada | Detectou? | Executou? |
|---|---|---|
| | | |

## 6. ⚠ Por que a regra não resolve
| Item | Valor |
|---|---|
| a regra está certa? | |
| o problema é a CAMADA? | |
| por quê | |

## 7. O que resolve
| # | Ação | Efeito |
|---|---|---|
| | | |

## 8. ⚠ O que eu NÃO fiz
- [ ] não testei WAF de terceiro
- [ ] não usei o bypass para acessar nada
- [ ] não publiquei
- [ ] não calculei severidade

## 9. O que NÃO foi verificado
⚠ mínimo 3

## 10. O que isso destrava
| # | Próxima ação | Prioridade |
```

**Produza `relatorio-assimetria.md`:**

| Item | Valor |
|---|---|
| Assimetria | |
| Por que a regra não resolve | |
| O que resolve | |
| O que não fiz | |

**Responda:**

1. **A assimetria é de contagem, de forma, ou as duas?
2. **A regra do WAF está certa?** Então onde está o problema?
3. **Qual das três ações você aplicaria?
4. **O que você não fez?**

### Critérios de aceitação

- `waf.md` com as **cinco** etapas e a divergência de cada.
- Você explicou **por que a etapa 5 é o ponto cego estrutural**.
- Você explicou **o que o WAF compara e o que ele entrega**.
- Você explicou **por que o `WAFFLED` não se evita com mais regras**.
- `assimetria.md` com as **quatro** medições.
- Você explicou **a diferença entre assimetria de contagem e de forma**.
- Você explicou **por que comparar dois logs é o único jeito**.
- `compara-camadas.py` rodado, com a diferença medida.
- Você identificou **os paths exclusivos do backend**.
- `o-que-fazer.md` com as **três** ações e o que cada uma pega.
- Você explicou **por que "mais regras" é a tentação**.
- Você explicou **por que "o efeito não muda com a evasão"**.
- A **cadeia com o WAF** montada, em 127.0.0.1.
- O **payload de dupla codificação** testado, com a resposta do WAF.
- Você verificou **o que cada camada registrou**.
- `caderno/PD-010.md` com as **nove** seções.
- `relatorio-assimetria.md` com as **dez** seções.
- Você explicou **por que a regra está certa e não basta**.
- ⚠ **Nenhum WAF de terceiro.** Tudo em 127.0.0.1.

---

## Avaliação

1. **Por que o detector é uma camada a mais?
2. **O que isso implica?** O que ele não resolve?
3. **Cite as cinco etapas** do WAF.
4. **Qual é o ponto cego estrutural?** Por quê?
5. **O que o WAF compara?** E o que entrega?
6. **Onde vive o espaço da evasão?
7. **O que o corrigiria de fato?** Qual o custo?
8. **O que o `WAFFLED` mediu?** Cite os números.
9. **Por que mais regras não resolvem?
10. **Cite as quatro medições** da assimetria.
11. **Como se mede a assimetria?** Por que só assim?
12. **O que a diferença de contagem significa?
13. **E a diferença de forma?
14. **O que a comparação de logs revela?** Cite quatro casos.
15. **Cite as três ações** e o que cada uma pega.
16. **Qual é a tentação?** Por que é errada?
17. **O que correlacionar pega que a regra não pega?
18. **Por que instrumentar o backend é o mais eficaz?
19. **Por que "o efeito não muda com a evasão"?
20. **Quando o problema é a camada, qual é a solução?

---

**Próximo:** [Módulo 11 — Projeto: a regra medida](modulo-11.md)
