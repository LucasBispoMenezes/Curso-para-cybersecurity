# Módulo 5 — Telemetria e o que Falta

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 4

---

## Objetivos

1. Entender por que **instrumentar é um projeto**, não uma configuração.
2. Saber **o que logar** para responder às perguntas de detecção.
3. Reconhecer o **custo** de cada campo — em volume, em latência e em privacidade.
4. **Instrumentar** o log que falta, no lab.
5. Declarar o que **permanece invisível** — e por quê.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **O log que você tem foi escrito para **operação**.** **Ele responde "o serviço funcionou?"** — **e
> não "o que foi executado?".**

⚠ **E é a razão de a detecção exigir instrumentar.** **Os logs de aplicação nascem para depurar** —
**e a pergunta de segurança é outra.**

⚠ **A tese:**

> **Logar é escolher o que você vai querer saber depois.** **E a escolha tem custo em três moedas:**
> **volume, latência e privacidade.**

⚠ **A tabela do que o log de aplicação típico tem, e o que falta:**

| Campo | Tem? | ⚠ Serve para detectar? |
|---|---|---|
| Timestamp | ✓ | ✓ |
| Path | ✓ | ⚠ **Parcial** |
| Status | ✓ | ⚠ Parcial |
| ⚠ **Headers completos** | ⚠ Raramente | ✓ **Sim** |
| ⚠ **Forma original** | ⚠ **Raramente** | ⚠⚠ **Essencial** |
| ⚠ **O que executou** | ⚠ **Raramente** | ⚠⚠ **O mais forte** |
| Corpo | ⚠ Não | ⚠ Com privacidade |

⚠ **A linha da "forma original" é o que o módulo 4 exigiu.** **Um log que registra o path
**normalizado** não permite detectar a evasão por encoding** — **porque a normalização já apagou o
que você precisava ver.**

⚠ **E a linha "o que executou" é a estratégia 3 do módulo 4** — **e é o campo que quase nenhum log
tem.**

---

## 5.1 O que logar

⚠ **Três perguntas, e cada uma pede um campo diferente.**

| Pergunta | Campo necessário | ⚠ Custo |
|---|---|---|
| **O que o atacante mandou?** | ⚠ **A forma original** | Baixo |
| **O que o sistema entendeu?** | A forma normalizada | Baixo |
| ⚠ **O que o sistema FEZ?** | ⚠ **O efeito** | ⚠ Alto |

⚠ **A terceira pergunta é a que a detecção moderna tenta responder** — **e é a que exige o log mais
caro.**

⚠ **A tabela do que registrar, por pergunta:**

| Pergunta | Campo | Onde |
|---|---|---|
| O que mandou | ⚠ **bytes crus** | Fronteira |
| O que mandou | headers originais | Fronteira |
| O que entendeu | path normalizado | App |
| O que entendeu | headers parseados | App |
| ⚠ **O que fez** | ⚠ **query executada** | ⚠ **App — perigoso** |
| ⚠ **O que fez** | ⚠ **arquivo aberto** | ⚠ SO |
| ⚠ **O que fez** | ⚠ **conexão de saída** | ⚠ SO / rede |
| O que fez | processo filho | ⚠ EDR |

⚠ **A linha da "query executada" é a mais valiosa e a mais perigosa.** **Registrar a query detecta
SQLi trivialmente** — **e registra os dados do usuário junto.** **É o exemplo perfeito do trade-off
de privacidade.**

⚠ **A linha do "arquivo aberto" é a mais elegante.** **Um path traversal abre um arquivo **fora do
webroot**** — **e isso é observável no SO, sem qualquer análise do payload.**

⚠ **A regra escrita:**

> **O log mais forte não registra o pedido; registra o efeito.** **E o efeito é o que a evasão não
> muda.**

```bash
mkdir -p ~/detect-lab/mod05 && cd ~/detect-lab/mod05

echo "═══ 1. o que logar ═══"
echo
cat > o-que-logar.md <<'EOF'
# O que logar

## As três perguntas
| Pergunta | Campo | Custo |
|---|---|---|
| o que o atacante MANDOU? | ⚠ a FORMA ORIGINAL | baixo |
| o que o sistema ENTENDEU? | a forma normalizada | baixo |
| ⚠ o que o sistema FEZ? | ⚠ o EFEITO | ⚠ alto |

## Por campo
| Pergunta | Campo | Onde |
|---|---|---|
| mandou | ⚠ bytes CRUS | fronteira |
| mandou | headers ORIGINAIS | fronteira |
| entendeu | path normalizado | app |
| entendeu | headers parseados | app |
| ⚠ FEZ | ⚠ query executada | ⚠ app — PERIGOSO |
| ⚠ FEZ | ⚠ arquivo aberto | ⚠ SO |
| ⚠ FEZ | ⚠ conexão de saída | ⚠ SO / rede |
| fez | processo filho | ⚠ EDR |

## ⚠ a linha mais valiosa e mais perigosa
a QUERY EXECUTADA.
registrar a query detecta SQLi trivialmente —
e registra os DADOS DO USUÁRIO junto.
✓ é o exemplo perfeito do TRADE-OFF de privacidade.

## ⚠ a linha mais elegante
o ARQUIVO ABERTO.
um path traversal abre um arquivo FORA do webroot —
e isso é observável no SO, SEM analisar o payload.

## ⚠ A REGRA
o log mais forte não registra o PEDIDO; registra o EFEITO.
✓ e o efeito é o que a EVASÃO NÃO MUDA.
EOF

cat o-que-logar.md
```

⚠ **A tabela das três perguntas é o instrumento.** **E a linha do efeito é a ponte com o módulo 3:**
**a ação é o invariante, e é o que se loga.**

⚠ **E o trade-off da query é honesto:** **o campo mais útil é o mais regulado.**

**Produza `o-que-logar.md`:**

| Pergunta | Campo | Custo |
|---|---|---|
| Mandou | | |
| Entendeu | | |
| Fez | | |

**Responda:**

1. **Por que o efeito é o log mais forte?
2. **Por que a forma original é essencial** (módulo 4)?
3. **Qual campo é o mais perigoso?** Por quê?
4. **Qual é o mais elegante?** Por quê?

---

## 5.2 O custo

⚠ **As três moedas. E cada campo custa nas três.**

| Campo | Volume | Latência | Privacidade |
|---|---|---|---|
| Timestamp + path | ✓ Baixo | ✓ Baixa | ⚠ Baixa |
| Headers completos | Médio | Baixa | ⚠ Média |
| ⚠ **Forma original** | Médio | Baixa | ⚠ Média |
| ⚠ **Corpo** | ⚠⚠ **Alto** | Média | ⚠⚠ **Alta** |
| ⚠ **Query executada** | Médio | Média | ⚠⚠ **Alta** |
| ⚠ **Conexões de saída** | ⚠ Alto | Baixa | Média |

⚠ **A tabela do que fazer com o volume:**

| Estratégia | Efeito |
|---|---|
| Logar tudo | ⚠⚠ **Inviável em volume** |
| ⚠ **Logar a forma, não o conteúdo** | ✓ **O melhor equilíbrio** |
| Amostragem | ⚠ Perde eventos raros |
| Logar só o suspeito | ⚠ **Precisa da regra antes** |

⚠ **A segunda linha é a mais importante do módulo.** **Logar o **hash** do corpo, e não o corpo** —
**ou logar os **primeiros N bytes**, e não o payload inteiro** — **reduz o volume e a exposição sem
perder a capacidade de detectar o padrão.**

⚠ **E a quarta linha é o paradoxo:** **logar só o suspeito exige a regra — e a regra precisa do log
para ser escrita.** **É um ciclo que se resolve com um período de log amplo, e depois redução.**

⚠ **A regra escrita:**

> **Não logue o conteúdo; logue a forma.** **O hash do corpo, o tamanho, os headers originais, os
> primeiros bytes.** **É o suficiente para detectar — e é muito menos dado pessoal.**

```bash
cd ~/detect-lab/mod05

echo "═══ 2. o custo ═══"
echo
cat > custo.md <<'EOF'
# O custo

| Campo | Volume | Latência | Privacidade |
|---|---|---|---|
| timestamp + path | ✓ baixo | ✓ baixa | ⚠ baixa |
| headers completos | médio | baixa | ⚠ média |
| ⚠ FORMA ORIGINAL | médio | baixa | ⚠ média |
| ⚠ CORPO | ⚠⚠ alto | média | ⚠⚠ ALTA |
| ⚠ QUERY EXECUTADA | médio | média | ⚠⚠ ALTA |
| ⚠ CONEXÕES DE SAÍDA | ⚠ alto | baixa | média |

## O que fazer com o volume
| Estratégia | Efeito |
|---|---|
| logar TUDO | ⚠⚠ inviável em volume |
| ⚠ LOGAR A FORMA, NÃO O CONTEÚDO | ✓ O MELHOR EQUILÍBRIO |
| amostragem | ⚠ perde eventos RAROS |
| logar só o SUSPEITO | ⚠ precisa da regra ANTES |

## ⚠ a linha mais importante
logar o HASH do corpo, e não o corpo.
ou os PRIMEIROS N bytes.
✓ reduz o volume E a exposição
   SEM perder a capacidade de detectar o padrão.

## ⚠ o paradoxo da última linha
"logar só o suspeito" exige a REGRA —
e a regra precisa do LOG para ser escrita.
✓ resolve-se com um período de log AMPLO, e depois REDUÇÃO.

## ⚠ A REGRA
não logue o CONTEÚDO; logue a FORMA.
o hash, o tamanho, os headers originais, os primeiros bytes.
✓ é o suficiente para DETECTAR —
   e é muito menos dado pessoal.
EOF

cat custo.md
```

⚠ **A estratégia "logar a forma" é o que resolve o trade-off.** **E ela é a resposta prática do
módulo:** **você não precisa do payload; precisa da **assinatura** dele.**

⚠ **E o paradoxo da última linha é real e tem solução:** **log amplo por um período — medir — e
reduzir.**

**Produza `custo.md`:**

| Campo | Volume | Privacidade |
|---|---|---|
| Corpo | | |
| Forma original | | |
| Query executada | | |

**Responda:**

1. **Qual a estratégia de melhor equilíbrio?** Por quê?
2. **Como logar a forma sem o conteúdo?
3. **O que o paradoxo do "só o suspeito" diz?
4. **Por que a amostragem é ruim** para detecção?

---

## 5.3 Instrumentando

⚠ **O exercício do módulo: **adicionar o campo que falta.** **E medir o custo.**

| # | O que instrumentar | Custo |
|---|---|---|
| 1 | A forma **original** no log | ✓ Baixo |
| 2 | O **hash** do corpo | ✓ Baixo |
| 3 | As **conexões de saída** | Médio |
| 4 | ⚠ **O arquivo aberto** | ⚠ Requer SO |

⚠ **A primeira é a mais simples e a mais transformadora.** **Registrar o que **chegou**, antes de
qualquer normalização** — **e é o que permite detectar a evasão do módulo 4.**

⚠ **A tabela do que muda, com e sem a forma original:**

| Ataque | Log normalizado | ⚠ Com a forma original |
|---|---|---|
| `%253Cscript%253E` | ⚠ **Invisível** | ✓ Visível |
| Espaço no header | ⚠ **Já removido** | ✓ Visível |
| ⚠ Obs-fold | ⚠ **Já dobrado** | ✓ Visível |
| Path com CR/LF | ⚠ **Truncado** | ✓ Visível |

⚠ **A tabela é o argumento.** **O log normalizado **apaga** exatamente o que a detecção precisa** —
**e é o que o módulo 4 demonstrou.**

⚠ **E a nota do SO é a mais cara.** **Saber qual arquivo foi aberto exige auditoria do SO** —
**`auditd` no Linux, ou o EDR.** **E é o campo mais forte de todos** (módulo 3).

⚠ **A regra escrita:**

> **O log nasce para depurar, e a depuração quer a forma limpa.** **A detecção quer a forma
> suja.** **Instrumentar é adicionar a segunda.**

```bash
cd ~/detect-lab/mod05

echo "═══ 3. instrumentando ═══"
echo
cat > instrumentacao.md <<'EOF'
# Instrumentando

| # | O que instrumentar | Custo |
|---|---|---|
| 1 | a FORMA ORIGINAL | ✓ baixo |
| 2 | o HASH do corpo | ✓ baixo |
| 3 | as CONEXÕES DE SAÍDA | médio |
| 4 | ⚠ o ARQUIVO ABERTO | ⚠ requer SO |

## O que muda, com e sem a forma original
| Ataque | log normalizado | ⚠ com a forma original |
|---|---|---|
| `%253Cscript%253E` | ⚠ INVISÍVEL | ✓ visível |
| espaço no header | ⚠ já REMOVIDO | ✓ visível |
| ⚠ obs-fold | ⚠ já DOBRADO | ✓ visível |
| path com CR/LF | ⚠ TRUNCADO | ✓ visível |

## ⚠ a tabela é o argumento
o log normalizado APAGA exatamente o que a detecção precisa.

## ⚠ a nota do SO
saber qual ARQUIVO foi aberto exige auditoria do SO —
auditd no Linux, ou o EDR.
✓ e é o campo MAIS FORTE de todos (módulo 3).

## ⚠ A REGRA
o log nasce para DEPURAR, e a depuração quer a forma LIMPA.
a detecção quer a forma SUJA.
✓ instrumentar é ADICIONAR a segunda.
EOF

cat instrumentacao.md

echo
echo "═══ 4. o log que registra a FORMA ═══"
echo
cat > frontend_forma.py <<'PY'
#!/usr/bin/env python3
"""
frontend_forma.py — um frontend que registra a FORMA ORIGINAL.

⚠ a diferença em relação ao frontend anterior:
   ele guarda os BYTES CRUS antes de qualquer parsing.

⚠ DIDÁTICO e LOCAL (127.0.0.1).
"""
import socket, sys, threading, os, hashlib, time

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8400
BACKEND = ("127.0.0.1", int(sys.argv[2]) if len(sys.argv) > 2 else 8090)
LOG = os.path.expanduser("~/detect-lab/telemetria/forma.log")
MAX_ORIGINAL = 512      # ⚠ os primeiros N bytes — não o payload inteiro
_c, _lock = 0, threading.Lock()


def atende(cli):
    global _c
    try:
        # ── lê os bytes CRUS, sem parsear ──
        dados = b""
        while b"\r\n\r\n" not in dados and len(dados) < 65536:
            b = cli.recv(4096)
            if not b: return
            dados += b

        with _lock:
            _c += 1
            n = _c

        # ⚠ A FORMA ORIGINAL — truncada, e o hash
        original = dados[:MAX_ORIGINAL]
        h = hashlib.sha256(dados).hexdigest()[:16]

        with open(LOG, "a") as f:
            f.write(f"\n═══ conexão #{n} ═══\n")
            f.write(f"TAMANHO_CRU: {len(dados)}B\n")
            f.write(f"HASH: {h}\n")
            f.write(f"⚠ FORMA_ORIGINAL (hex, {len(original)}B):\n")
            f.write(f"  {original.hex()}\n")
            f.write(f"⚠ FORMA_ORIGINAL (repr):\n")
            f.write(f"  {original!r}\n")

        print(f"  [frontend #{n}] {len(dados)}B  hash={h}  ⚠ forma registrada", flush=True)

        # ── repassa ao backend ──
        with socket.create_connection(BACKEND, timeout=3) as be:
            be.sendall(dados)
            be.settimeout(3)
            try:
                while True:
                    d = be.recv(4096)
                    if not d: break
                    cli.sendall(d)
            except socket.timeout:
                pass
        cli.close()
    except Exception:
        try: cli.close()
        except Exception: pass


def main():
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    open(LOG, "w").close()
    s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT)); s.listen(5)
    print(f"═══ FRONTEND COM FORMA ORIGINAL em {HOST}:{PORT} → {BACKEND} ═══")
    print(f"  log: {LOG}")
    print(f"  ⚠ registra os primeiros {MAX_ORIGINAL} bytes + hash — NÃO o payload inteiro")
    print("  ⚠ local, didático.")
    print()
    while True:
        cli, _ = s.accept()
        threading.Thread(target=atende, args=(cli,), daemon=True).start()


if __name__ == "__main__":
    main()
PY

chmod +x frontend_forma.py

echo "  ── o frontend instrumentado está pronto ──"
echo "     python3 ~/detect-lab/mod05/frontend_forma.py 8400 8090"
echo
echo "═══ ⚠ E O QUE ELE RESOLVE ═══"
cat <<'EXPL'
  ── sem a forma original ──
     o log do backend mostra o path NORMALIZADO
     ⚠ e a evasão por encoding DESAPARECEU

  ── com a forma original ──
     ⚠ o hex mostra "%253Cscript%253E" COMO CHEGOU
     ✓ e a regra do módulo 4 pode casar

  ✓ e note: o log guarda os PRIMEIROS 512 bytes e o HASH.
     ⚠ não o payload inteiro.
     ✓ é o equilíbrio do §5.2.
EXPL
```

⚠ **O frontend instrumentado é o instrumento.** **E ele guarda a forma truncada + hash** — **o
equilíbrio entre detectar e não acumular dado pessoal.**

⚠ **E é a resposta prática do módulo 4:** **sem a forma original, a regra alinhada não tem o que
comparar.**

**Produza `instrumentado.md`:**

| Campo | Antes | Depois |
|---|---|---|
| Forma original | | |
| Hash | | |
| Tamanho | | |

**Responda:**

1. **O que o frontend instrumentado registra?
2. **Por que a forma truncada + hash é o equilíbrio?
3. **O que ele resolve do módulo 4?
4. **O que ele NÃO resolve** (dica: a ação)?

---

## 5.4 LAB — Instrumentando e medindo

**Duração:** 120 min

### Passo 1 — Instrumente a forma original (40 min)

```bash
cd ~/detect-lab/mod05

echo "═══ INSTRUMENTANDO ═══"
echo
cat <<'EXPL'
  ── O QUE FAZER ──

     1. suba o frontend instrumentado (8400 → o seu backend)
     2. mande um payload com evasão por ENCODING
     3. ⚠ compare os DOIS logs:
        · o do backend (forma normalizada)
        · o do frontend_forma (forma ORIGINAL)

  ── E VOCÊ VÊ A DIFERENÇA ──
     · o backend registra a forma DECODIFICADA
     · ⚠ o frontend registra o HEX do que CHEGOU
EXPL

mkdir -p ~/detect-lab/telemetria

cat > evidencia-forma.sh <<'SCRIPT'
#!/usr/bin/env bash
# evidencia-forma.sh — compara a forma ORIGINAL com a normalizada
set -uo pipefail

echo "═══════════ FORMA ORIGINAL × NORMALIZADA ═══════════"
echo

# manda um payload com dupla codificação
PAYLOAD='GET /%253Cscript%253E HTTP/1.1'
echo "  ── o que eu vou mandar ──"
printf '     %s\n' "$PAYLOAD"
echo

python3 - "$PAYLOAD" <<'PY'
import socket, sys, time
p = sys.argv[1]
try:
    with socket.create_connection(("127.0.0.1", 8400), timeout=4) as s:
        s.sendall((p + "\r\nHost: l\r\n\r\n").encode())
        s.settimeout(2)
        try: s.recv(4096)
        except socket.timeout: pass
    print("  ✓ enviado ao frontend instrumentado")
except Exception as e:
    print(f"  ⚠ {type(e).__name__} — o frontend 8400 está rodando?")
PY

sleep 0.5
echo
echo "  ── o log do FRONTEND (forma original) ──"
tail -8 ~/detect-lab/telemetria/forma.log 2>/dev/null | sed 's/^/     /' || echo "     (vazio)"
echo
echo "  ── o log do BACKEND (forma normalizada) ──"
tail -6 ~/smuggle-lab/evidencia/backend-cl.log 2>/dev/null | sed 's/^/     /' || echo "     (vazio)"
echo
echo "  ⚠ compare: o frontend tem o HEX do que chegou;"
echo "     o backend tem o path já decodificado."
SCRIPT

chmod +x evidencia-forma.sh
echo "  ── o script está pronto ──"
echo "     bash ~/detect-lab/mod05/evidencia-forma.sh"
```

⚠ **O script compara os dois logs.** **E a diferença é o argumento do módulo:** **um tem a forma
original; o outro, a normalizada.**

⚠ **E ele é a prova prática de que o módulo 4 exigia instrumentar** — **sem a forma original, não há
como detectar a evasão por encoding.**

**Produza `comparacao.md`:**

| Log | O que registra |
|---|---|
| Frontend (instrumentado) | |
| Backend | |

**Responda:**

1. **Qual log tem a forma original?** Qual tem a normalizada?
2. **O payload com dupla codificação aparece** nos dois?
3. **O que o hash permite** que o hex não permite?
4. **Por que a forma original é pré-requisito** da regra alinhada?

### Passo 2 — Meça o custo (40 min)

⚠ **O custo em volume, e a decisão sobre o que logar.**

```bash
cd ~/detect-lab/mod05

echo "═══ MEDINDO O CUSTO ═══"
echo
cat > mede-custo.sh <<'SCRIPT'
#!/usr/bin/env bash
# mede-custo.sh — mede o VOLUME da telemetria
set -uo pipefail

echo "═══ CUSTO DA TELEMETRIA ═══"
echo

for f in "$HOME/detect-lab/telemetria/forma.log" \
         "$HOME/smuggle-lab/evidencia/backend-cl.log"; do
    if [ -f "$f" ]; then
        tam=$(stat -c %s "$f")
        linhas=$(wc -l < "$f")
        conexoes=$(grep -c '═══ conexão' "$f" 2>/dev/null || echo 0)
        req=$(grep -c '═══ requisição' "$f" 2>/dev/null || echo 0)
        n=$((conexoes + req))
        printf '  %s\n' "$(basename "$f")"
        printf '     tamanho     : %s B\n' "$tam"
        printf '     linhas      : %s\n' "$linhas"
        printf '     eventos     : %s\n' "$n"
        if [ "$n" -gt 0 ]; then
            printf '     ⚠ por evento: %s B\n' "$((tam / n))"
        fi
        echo
    fi
done

echo "── ⚠ A EXTRAPOLAÇÃO ──"
cat <<'EXPL'
  ⚠ multiplique o "por evento" pelo seu tráfego real:

     1M requisições/dia × N bytes = ? GB/dia
     × retenção de 30 dias          = ? GB

  ✓ e é esse número que decide o que logar.
EXPL
echo
echo "── O QUE FAZER COM O NÚMERO ──"
cat <<'EXPL'
  | se por evento for | então |
  |---|---|
  | < 500 B  | ✓ logue a forma, sempre |
  | 500 B–2KB | ⚠ logue a forma TRUNCADA |
  | > 2KB    | ⚠ amostragem, ou só o hash |
EXPL
SCRIPT

chmod +x mede-custo.sh
echo "  ── pronto ──"
echo "     bash ~/detect-lab/mod05/mede-custo.sh"

cat > caderno/PD-005.md <<'EOF'
# PD-005 — a telemetria

**Data:** ____

## 1. O que eu instrumentei
| Campo | Antes | Depois | Custo |
|---|---|---|---|
| forma original | | | |
| hash do corpo | | | |
| conexões de saída | | | |
| ⚠ arquivo aberto | | | |

## 2. A comparação
| Log | Registra | ⚠ Vê a evasão? |
|---|---|---|
| frontend instrumentado | | |
| backend | | |

## 3. O custo medido
| Item | Valor |
|---|---|
| eventos | |
| ⚠ bytes por evento | |
| extrapolação/dia | |
| ⚠ retenção possível | |

## 4. A decisão
| Campo | Loguei? | Por quê |
|---|---|---|
| forma original | | |
| corpo | | |
| query | | |
| arquivo aberto | | |

## 5. ⚠ O que permanece INVISÍVEL
| Item | Por quê | Aceito? |
|---|---|---|
| | | |

## 6. A privacidade
| Campo | Dado pessoal? | Mitigação |
|---|---|---|
| | | |

## 7. ⚠ O que eu NÃO fiz
- [ ] não liguei log de outro sistema
- [ ] não guardei payload de terceiro
- [ ] não testei fora de 127.0.0.1

## 8. O que NÃO foi verificado
⚠ mínimo 3
EOF

echo "  ⚠ a ficha PD-005 criada"
```

⚠ **A extrapolação é o instrumento econômico.** **E ela é o que transforma "logar tudo" de tentação
em inviabilidade** — **com número.**

⚠ **E a seção 5 da ficha é a mais importante:** **o que permanece invisível, e se você aceita.**

**Produza `custo-medido.md`:**

| Item | Valor |
|---|---|
| Bytes por evento | |
| Extrapolação/dia | |
| Retenção possível | |
| Decisão | |

**Responda:**

1. **Qual o custo por evento?** O que a extrapolação diz?
2. **O que você decidiu logar?** O que não?
3. **O que permanece invisível?
4. **Algum campo tem dado pessoal?** Como mitigou?

### Passo 3 — Documente (40 min)

Produza `relatorio-telemetria.md`:

```markdown
# Relatório — telemetria

## 1. As três perguntas
| Pergunta | Campo que responde | Existe? |
|---|---|---|
| o que mandou | | |
| o que entendeu | | |
| ⚠ o que FEZ | | |

## 2. O que foi instrumentado
| # | Campo | Onde | Custo |
|---|---|---|---|
| | | | |

## 3. A comparação de logs
| Log | Vê a evasão? |
|---|---|
| | |

## 4. O custo
| Item | Valor |
|---|---|
| bytes por evento | |
| extrapolação | |
| retenção | |

## 5. ⚠ O que permanece invisível
| Item | Por quê | Aceito | Mitigação |
|---|---|---|---|
| | | | |

## 6. A privacidade
| Campo | Dado pessoal | Como mitiguei |
|---|---|---|
| | | |

## 7. A regra que isso destrava
| Item | Valor |
|---|---|
| qual regra (módulo 3/4) | |
| ela era impossível antes? | |

## 8. ⚠ O que eu NÃO fiz
- [ ] não acessei log de outro sistema
- [ ] não guardei payload de terceiro
- [ ] não testei fora de 127.0.0.1
- [ ] não publiquei nada

## 9. O que NÃO foi verificado
⚠ mínimo 3

## 10. O que isso destrava
| # | Próxima regra | Prioridade |
```

**Produza `relatorio-telemetria.md`:**

| Item | Valor |
|---|---|
| Instrumentado | |
| Invisível | |
| Regra destravada | |
| O que não fiz | |

**Responda:**

1. **O que a instrumentação destravou em termos de regra?
2. **O que permanece invisível, e qual a mitigação?
3. **O custo está medido?
4. **O que você não fez?**

### Critérios de aceitação

- `o-que-logar.md` com as **três** perguntas e os campos de cada.
- Você explicou **por que o efeito é o log mais forte**.
- Você explicou **por que a forma original é essencial**.
- Você explicou **o trade-off da query executada**.
- `custo.md` com os **seis** campos e as três moedas.
- Você explicou **qual estratégia é o melhor equilíbrio**.
- Você explicou **como logar a forma sem o conteúdo**.
- Você explicou **o paradoxo do "só o suspeito"**.
- Você explicou **por que a amostragem é ruim** para detecção.
- `instrumentacao.md` com a tabela **com × sem** a forma original.
- Você explicou **por que o log normalizado apaga o que a detecção precisa**.
- O **frontend instrumentado** rodando, com a forma truncada + hash.
- Você comparou **os dois logs** com o script.
- Você explicou **o que o hash permite** que o hex não permite.
- O **custo medido**, com a extrapolação.
- Você decidiu **o que logar** e **o que não**.
- Você declarou **o que permanece invisível**.
- `caderno/PD-005.md` com as **oito** seções.
- `relatorio-telemetria.md` com as **dez** seções.
- ⚠ **Nenhum log de terceiro.** Tudo em 127.0.0.1.

---

## Avaliação

1. **Para que os logs de aplicação nascem?** Por que a pergunta de segurança é outra?
2. **Cite as três perguntas** e o campo de cada.
3. **Qual campo responde "o que o sistema fez"?
4. **Por que o efeito é o log mais forte?
5. **Por que a forma original é essencial?
6. **Qual campo é o mais valioso e o mais perigoso?
7. **Qual é o mais elegante?** Por quê?
8. **Cite as três moedas do custo.
9. **Qual estratégia é o melhor equilíbrio?
10. **Como logar a forma sem o conteúdo?
11. **O que o hash do corpo permite?
12. **Por que a amostragem é ruim** para detecção?
13. **O que é o paradoxo do "só o suspeito"?
14. **Como ele se resolve?
15. **O que muda com a forma original?** Cite dois ataques.
16. **O que o log normalizado apaga?
17. **O que exige auditoria do SO?
18. **Qual o equilíbrio prático** de volume?
19. **Como se mede o custo da telemetria?
20. **O que declarar quando algo permanece invisível?

---

**Próximo:** [Módulo 6 — Falso positivo e o orçamento](modulo-06.md)
