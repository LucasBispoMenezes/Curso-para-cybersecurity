# Módulo 10 — Detecção e Defesa

**Carga:** 2 horas (45 min teoria · 1h15 lab)
**Pré-requisitos:** Módulos 1 a 9

---

## Objetivos

1. Ver o smuggling **do lado do defensor** — e por que a defesa é difícil.
2. Conhecer as **quatro defesas** e o que cada uma resolve.
3. Reconhecer a **defesa que elimina a classe** — e por que é rara.
4. Instrumentar o que **detecta** o desync em produção.
5. Escrever o relatório que o mantenedor **consegue usar**.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **A defesa não é "corrigir o parser".** **É fazer as duas camadas concordarem** — **e há quatro
> formas de consegui-lo.**

⚠ **E a razão de o módulo existir:** **você passou nove módulos do lado do atacante.** **E o
relatório que você vai escrever é lido por quem defende** — **e ele precisa saber o que fazer.**

⚠ **A tese:**

> **A defesa mais eficaz é a que NORMALIZA antes de repassar.** **E é rara porque exige que a camada
> reconstrua a mensagem** — **o que custa performance e pode quebrar clientes legados.**

⚠ **A tabela das quatro defesas:**

| # | Defesa | O que resolve | ⚠ Custo |
|---|---|---|---|
| 1 | **Rejeitar a ambiguidade** | ⚠ **A classe inteira** | Quebra clientes tolerantes |
| 2 | **Normalizar antes de repassar** | ⚠ **A classe inteira** | Performance |
| 3 | **Fechar a conexão** | O desync entre requisições | Performance |
| 4 | **Separar o pool** | ⚠ O alcance | ⚠ Recursos |
| 5 | **Não fazer cache** | O alcance do poisoning | Custo de origem |

⚠ **A linha 2 é a defesa ideal, e a do módulo 2.** **Uma camada que reconstrói a mensagem a partir
do que **ela entendeu** elimina a divergência** — **porque a próxima camada nunca vê os bytes
originais.**

⚠ **A tabela do que cada defesa exige:**

| Defesa | Exige | ⚠ Efeito |
|---|---|---|
| Rejeitar | Seguir a 9112 | ✓ Elimina |
| Normalizar | Reconstruir a mensagem | ✓ Elimina |
| Fechar | `Connection: close` | ⚠ Reduz |
| Separar pool | Front e back distintos | ⚠ Reduz |
| Não cachear | `Cache-Control: private` | ⚠ Reduz |

⚠ **A regra escrita:**

> **As duas primeiras eliminam a classe; as três últimas reduzem o alcance.** **E a diferença importa
> no relatório** — **porque "elimina" e "reduz" são recomendações diferentes.**

---

## 10.1 Por que a defesa é difícil

⚠ **Cinco razões. E as cinco são estruturais.**

| # | Razão | ⚠ Consequência |
|---|---|---|
| 1 | **Duas camadas, dois times** | ⚠ Ninguém vê o todo |
| 2 | **Tolerância por compatibilidade** | ⚠ O cliente legado existe |
| 3 | ⚠ **A spec antiga** | Idade das implementações |
| 4 | **Normalizar custa** | Performance |
| 5 | ⚠ **O desync é assíncrono** | ⚠ **Difícil de detectar em produção** |

⚠ **A linha 3 é a mais estrutural.** **Um proxy de 2012 segue a RFC 2616, que era ambígua.** **E ele
não é "bugado" — ele é **da época**.

⚠ **E a linha 5 é o que torna a **detecção** difícil.** **O desync não produz erro no log do
atacante** — **ele produz uma requisição estranha **no log de outra pessoa**.** **É o que a tabela
de detecção procura.**

⚠ **A tabela do que o defensor vê:**

| Sinal | Onde aparece | ⚠ Falso positivo |
|---|---|---|
| **Requisição com path estranho** | Access log | Baixo |
| ⚠ **Dois `CL` na mesma requisição** | Access log | ⚠ **Nenhum — é sinal forte** |
| ⚠ **`TE` + `CL` na mesma** | Access log | ⚠ Nenhum |
| Requisição **sem linha de requisição** | Log do backend | ⚠ Idem |
| ⚠ **Timeout de cabeçalho** | Log do frontend | ⚠ **Alto — tráfego lento é normal** |

⚠ **As linhas 2 e 3 são os sinais sem falso positivo.** **Uma requisição com dois `Content-Length`
é **sempre** suspeita** — **e a spec diz para rejeitar.** **É o que o defensor instrumenta primeiro.**

⚠ **A linha 5 é a que confunde.** **Timeouts são normais** — **e um frontend que loga todos eles
produz ruído.** **Você instrumenta os sinais específicos, não o genérico.**

⚠ **A regra escrita:**

> **Instrumente o sinal específico, não o genérico.** **Dois `CL` é sinal; "lentidão" é ruído.**

```bash
mkdir -p ~/smuggle-lab/mod10 && cd ~/smuggle-lab/mod10

echo "═══ 1. por que a defesa é difícil ═══"
echo
cat > defesa.md <<'EOF'
# Por que a defesa é difícil

## As cinco razões
| # | Razão | Consequência |
|---|---|---|
| 1 | duas camadas, dois TIMES | ninguém vê o todo |
| 2 | tolerância por compatibilidade | o cliente legado existe |
| 3 | ⚠ a SPEC ANTIGA | idade das implementações |
| 4 | normalizar CUSTA | performance |
| 5 | ⚠ o desync é ASSÍNCRONO | ⚠ difícil de detectar |

## As quatro defesas
| # | Defesa | Resolve | Custo |
|---|---|---|---|
| 1 | REJEITAR a ambiguidade | ⚠ a classe inteira | quebra clientes |
| 2 | ⚠ NORMALIZAR antes de repassar | ⚠ a classe inteira | performance |
| 3 | fechar a conexão | o desync entre requisições | performance |
| 4 | separar o pool | o alcance | recursos |
| 5 | não fazer cache | o alcance do poisoning | custo de origem |

## ⚠ a linha que importa no relatório
as DUAS primeiras ELIMINAM a classe.
as três últimas REDUZEM o alcance.
✓ "elimina" e "reduz" são recomendações DIFERENTES.

## O que o defensor VÊ
| Sinal | Onde | Falso positivo |
|---|---|---|
| path estranho | access log | baixo |
| ⚠ DOIS Content-Length | access log | ⚠ NENHUM |
| ⚠ TE + CL | access log | ⚠ nenhum |
| sem linha de requisição | log do backend | idem |
| ⚠ timeout de cabeçalho | log do frontend | ⚠ ALTO |

## ⚠ A REGRA
instrumente o sinal ESPECÍFICO, não o genérico.
dois CL é SINAL. "lentidão" é RUÍDO.
EOF

cat defesa.md
```

⚠ **As quatro defesas são o entregável do módulo.** **E a distinção entre **eliminar** e **reduzir**
é o que o relatório precisa deixar claro.**

⚠ **E a tabela de sinais é o que o mantenedor usa** — **porque ele já tem os logs, e não tem o
mecanismo.**

**Produza `defesa.md`:**

| # | Defesa | Resolve |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |

**Responda:**

1. **Quais defesas eliminam a classe?** Por quê?
2. **Por que a defesa é estrutural** e não um bug?
3. **Quais sinais não têm falso positivo?
4. **Por que o timeout é ruim** como sinal?

---

## 10.2 O que detecta

⚠ **A instrumentação. E ela é do lado do **acesso** — não do atacante.**

| Regra de detecção | O que procura | ⚠ FP |
|---|---|---|
| **Dois `CL`** | ⚠ **Ambos presentes** | Nenhum |
| **`TE` + `CL`** | ⚠ **Ambos presentes** | Nenhum |
| **`TE` com valor estranho** | Ofuscação | Baixo |
| **Espaço antes do `:`** | Forma inválida | Baixo |
| ⚠ **Path com CR/LF** | Injeção | Nenhum |
| **Requisição muito lenta** | ⚠ **Ruído** | ⚠ **Alto** |

⚠ **As regras 1 e 2 são as que você instala primeiro.** **Elas não produzem falso positivo, e a spec
diz que a mensagem é inválida** — **então rejeitar é conforme.**

⚠ **E a tabela do que fazer com o alerta:**

| Alerta | Ação |
|---|---|
| Dois `CL` | ⚠ **Rejeitar a requisição** |
| `TE` + `CL` | ⚠ **Rejeitar, ou usar só o TE e remover o CL** |
| Ofuscação | Rejeitar, ou normalizar |
| ⚠ Path com CR/LF | ⚠ **Rejeitar e investigar** |
| Lentidão | ⚠ Nada — é ruído |

⚠ **A linha 5 é o que evita o alerta fadiga.** **Uma regra que dispara em tráfego normal é uma regra
que o time desliga.**

⚠ **E a tabela da defesa ideal, que o relatório recomenda:**

| Se o produto puder | Recomende |
|---|---|
| Rejeitar | ⚠ **A primeira escolha** |
| Reconstruir | ⚠ A segunda |
| ⚠ Só monitorar | ⚠ **Registre e alerta — mas não é defesa** |

⚠ **A regra escrita:**

> **Monitorar não é defender.** **Um produto que só alerta continua vulnerável** — **e o relatório
> deve dizer isso com clareza.**

```bash
cd ~/smuggle-lab/mod10

echo "═══ 2. o que detecta ═══"
echo
cat > detecta.md <<'EOF'
# O que detecta

| Regra | Procura | Falso positivo |
|---|---|---|
| DOIS Content-Length | ambos presentes | ⚠ NENHUM |
| TE + CL | ambos presentes | ⚠ NENHUM |
| TE com valor estranho | ofuscação | baixo |
| espaço antes do : | forma inválida | baixo |
| ⚠ path com CR/LF | injeção | ⚠ nenhum |
| requisição muito lenta | ⚠ RUÍDO | ⚠ ALTO |

## O que fazer com o alerta
| Alerta | Ação |
|---|---|
| dois CL | ⚠ REJEITAR |
| TE + CL | ⚠ rejeitar, ou usar só o TE |
| ofuscação | rejeitar, ou normalizar |
| path com CR/LF | ⚠ rejeitar e INVESTIGAR |
| lentidão | ⚠ nada — ruído |

## ⚠ por que as duas primeiras primeiro
não produzem falso positivo
E a spec diz que a mensagem é INVÁLIDA.
✓ então rejeitar é CONFORME.

## ⚠ a defesa ideal
| Se o produto puder | Recomende |
|---|---|
| REJEITAR | ⚠ primeira escolha |
| RECONSTRUIR | segunda |
| ⚠ só MONITORAR | ⚠ registre e alerte — mas NÃO é defesa |

## ⚠ A REGRA
monitorar NÃO é defender.
um produto que só alerta continua VULNERÁVEL —
e o relatório deve dizer isso.
EOF

cat detecta.md

echo
echo "═══ 3. o detector, no seu lab ═══"
echo
cat > detector.py <<'PY'
#!/usr/bin/env python3
"""
detector.py — um frontend que DETECTA e REJEITA a ambiguidade.

⚠ DIDÁTICO e LOCAL (127.0.0.1).
   é a defesa do módulo, para você medir o EFEITO dela.
"""
import socket, sys, threading, os
from re import search

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8300
BACKEND = ("127.0.0.1", int(sys.argv[2]) if len(sys.argv) > 2 else 8090)
LOG = os.path.expanduser("~/smuggle-lab/evidencia/detector.log")

# ⚠ as regras de detecção
def analisa(cabecalho: str):
    """retorna (bloquear?, motivo)"""
    linhas = cabecalho.split("\r\n")
    n_cl, tem_te = 0, False

    for l in linhas[1:]:
        if not l: continue
        low = l.lower()
        if low.startswith("content-length:"):
            n_cl += 1
            # ⚠ espaço no valor ou antes do ":" = forma suspeita
            if l != l.strip() or " :" in l or ":  " in l:
                return True, "CL com forma inválida"
        if low.startswith("transfer-encoding:"):
            tem_te = True
            v = low.split(":", 1)[1].strip()
            if v != "chunked":
                return True, f"TE com valor estranho: {v!r}"
        # ⚠ espaço antes dos dois pontos
        if " :" in l:
            return True, "espaço antes do ':'"

    if n_cl > 1:
        return True, f"DOIS Content-Length ({n_cl})"
    if n_cl >= 1 and tem_te:
        return True, "TE + CL na mesma mensagem"
    return False, ""


def atende(cli):
    try:
        dados = b""
        while b"\r\n\r\n" not in dados:
            b = cli.recv(1)
            if not b: return
            dados += b
        fim = dados.index(b"\r\n\r\n") + 4
        cab = dados[:fim].decode(errors="replace")

        bloquear, motivo = analisa(cab)

        with open(LOG, "a") as f:
            f.write(f"\n═══ requisição ═══\n{cab[:200]}\n")
            if bloquear:
                f.write(f"⚠ BLOQUEADO: {motivo}\n")
            else:
                f.write("✓ permitido\n")

        if bloquear:
            print(f"  [detector] ⚠ BLOQUEOU: {motivo}", flush=True)
            cli.sendall(b"HTTP/1.1 400 Bad Request\r\nContent-Length: 9\r\n\r\nBLOQUEADO")
            cli.close(); return

        print(f"  [detector] ✓ permitido — repassando", flush=True)
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
    print(f"═══ DETECTOR em {HOST}:{PORT} → {BACKEND} ═══")
    print("  ⚠ regras: dois CL, TE+CL, formas inválidas")
    print(f"  log: {LOG}")
    print("  ⚠ local, didático.")
    print()
    while True:
        cli, _ = s.accept()
        threading.Thread(target=atende, args=(cli,), daemon=True).start()


if __name__ == "__main__":
    main()
PY

chmod +x detector.py

echo "  ── o detector está pronto ──"
echo "     python3 ~/smuggle-lab/mod10/detector.py 8300 8090"
echo
echo "═══ ⚠ E O TESTE DA DEFESA ═══"
cat <<'EXPL'
  ── rode as variantes CONTRA O DETECTOR ──

     python3 ~/smuggle-lab/mod09/varre.py 8300

     ⚠ e compare com o resultado SEM o detector:
        · antes: algumas davam DESYNC
        · depois: ⚠ devem dar REJEITADO

  ✓ e a diferença é a MEDIDA DA DEFESA.
     um "rejeitado" a mais é uma variante neutralizada.
EXPL
```

⚠ **O detector é o instrumento da defesa.** **E ele implementa as regras sem falso positivo** —
**dois `CL`, `TE` + `CL`, formas inválidas.**

⚠ **E a comparação antes/depois é a medida:** **você roda a mesma varredura com e sem o detector** —
**e conta quantas variantes passaram de DESYNC para REJEITADO.**

**Produza `detecta.md`:**

| Regra | FP |
|---|---|
| Dois `CL` | |
| `TE` + `CL` | |
| Lentidão | |

**Responda:**

1. **Quais regras instalar primeiro?** Por quê?
2. **Por que "só monitorar" não é defesa?
3. **O que o detector faz com o alerta?
4. **Como medir o efeito da defesa?

---

## 10.3 LAB — A defesa medida

**Duração:** 75 min

### Passo 1 — Suba o detector e compare (45 min)

⚠ **A mesma varredura, com e sem o detector. A diferença é a medida.**

```bash
cd ~/smuggle-lab/mod10

echo "═══ MEDINDO A DEFESA ═══"
echo
cat <<'EXPL'
  ── O EXPERIMENTO CONTROLADO ──

     ANTES:  varredura contra o par SEM detector   → módulo 9
     DEPOIS: varredura contra o par COM detector   → agora

     ⚠ e a diferença é quantas variantes passaram
        de "DESYNC" para "REJEITADO".
EXPL

mkdir -p ~/smuggle-lab/evidencia

cat > evidencia/defesa-medida.md <<'EOF'
# A defesa, medida

## O experimento
| Config | Frontend | Resultado |
|---|---|---|
| ANTES | sem detector (módulo 9) | |
| DEPOIS | ⚠ com o detector | |

## A comparação, variante por variante
| # | Variante | Antes | ⚠ Depois |
|---|---|---|---|
| 1 | espaço no valor | | |
| 2 | espaço antes do : | | |
| 3 | CL.TE | | |
| 4 | TE.CL | | |
| 5 | TE.TE | | |
| 6 | CL.CL | | |
| 7 | obs-fold | | |

## ⚠ A medida
| Métrica | Valor |
|---|---|
| variantes com DESYNC (antes) | |
| variantes com DESYNC (depois) | |
| ⚠ NEUTRALIZADAS | |
| falsos positivos do detector | |

## O que a defesa NÃO resolveu
| # | Variante que ainda passa | Por quê |
|---|---|---|
| | | |

## A evidência literal
```
[detector.log]
```

## ⚠ A classificação das defesas
| Defesa | Elimina ou reduz? |
|---|---|
| rejeitar a ambiguidade | ⚠ ELIMINA |
| normalizar | ⚠ ELIMINA |
| fechar a conexão | reduz |
| separar o pool | reduz |
EOF

cat evidencia/defesa-medida.md
```

⚠ **O experimento controlado é o entregável.** **E a coluna "NEUTRALIZADAS" é a medida da defesa** —
**em número, não em opinião.**

⚠ **E a tabela final classifica as defesas** — **porque o relatório precisa dizer quais **eliminam**
e quais **reduzem**.**

**Produza `defesa-medida.md`:**

| Métrica | Valor |
|---|---|
| Desync antes | |
| Desync depois | |
| Neutralizadas | |

**Responda:**

1. **Quantas variantes foram neutralizadas?
2. **O detector produziu falso positivo?
3. **O que a defesa NÃO resolveu?
4. **Quais defesas eliminam** e quais reduzem?

### Passo 2 — Escreva a recomendação (30 min)

⚠ **O relatório que o mantenedor usa. E ele é diferente do de ataque.**

```bash
cd ~/smuggle-lab/mod10

echo "═══ A RECOMENDAÇÃO ═══"
echo
cat > recomendacao.md <<'EOF'
# Recomendação de defesa

## Para o PROXY (a camada que repassa)
| # | Recomendação | Efeito | Custo |
|---|---|---|---|
| 1 | ⚠ **REJEITAR a mensagem ambígua** | ⚠ ELIMINA | quebra clientes tolerantes |
| 2 | ⚠ **NORMALIZAR antes de repassar** | ⚠ ELIMINA | performance |
| 3 | fechar a conexão após a resposta | reduz | performance |
| 4 | ⚠ **não repassar o CL quando há TE** | ⚠ ELIMINA a variante | nenhum |

## Para o BACKEND
| # | Recomendação | Efeito |
|---|---|---|
| 1 | ⚠ **não confiar no CL recebido** | elimina o CL.0 |
| 2 | ⚠ **ler o corpo sempre** | elimina o CL.0 |
| 3 | rejeitar CL duplicado | elimina o CL.CL |

## Para o CACHE (se houver)
| # | Recomendação | Efeito |
|---|---|---|
| 1 | ⚠ **incluir TODOS os headers na chave** | elimina o poisoning |
| 2 | não cachear respostas com header não-chave | ⚠ reduz muito |
| 3 | `Cache-Control: private` onde couber | reduz |

## ⚠ O QUE **NÃO** É DEFESA
| Item | Por quê |
|---|---|
| monitorar e alertar | ⚠ o produto continua VULNERÁVEL |
| WAF na frente | ⚠ ⚠ o WAF é uma camada a MAIS — pode criAR a divergência |
| "atualizar o produto" | ⚠ sem dizer o que corrigir, é vago |

## ⚠ E A RECOMENDAÇÃO MAIS IMPORTANTE
> normalizar a mensagem antes de repassar.
> é a única que ELIMINA a classe sem depender de a spec ser seguida.
EOF

cat recomendacao.md
```

⚠ **A tabela do "não é defesa" é a mais valiosa.** **E a linha do WAF é contraintuitiva e
verdadeira:** **um WAF é uma camada a mais** — **e camada a mais é oportunidade a mais de divergir.**

⚠ **E a recomendação principal é a do módulo 2:** **normalizar antes de repassar** — **a única que
não depende de a spec ser seguida.**

**Produza `recomendacao.md`:**

| Destinatário | Recomendação | Efeito |
|---|---|---|
| Proxy | | |
| Backend | | |
| Cache | | |

**Responda:**

1. **Qual é a recomendação principal?** Por que ela é a única assim?
2. **O que NÃO é defesa?** Cite três.
3. **Por que o WAF pode piorar?
4. **O que o backend deve fazer?** Por quê?

### Critérios de aceitação

- `defesa.md` com as **quatro** defesas e o custo de cada.
- Você explicou **quais eliminam** e quais **reduzem**.
- Você explicou **as cinco razões** pelas quais a defesa é difícil.
- Você explicou **por que a spec antiga é estrutural**.
- `detecta.md` com as **seis** regras de detecção.
- Você explicou **quais não têm falso positivo**.
- Você explicou **por que a lentidão é ruim** como sinal.
- Você explicou **por que monitorar não é defender**.
- O **detector** rodando, com as regras sem FP.
- O **experimento controlado** antes × depois, medido.
- Você contou **quantas variantes foram neutralizadas**.
- Você verificou **os falsos positivos** do detector.
- `evidencia/defesa-medida.md` com a comparação variante por variante.
- `recomendacao.md` com as recomendações **por destinatário**.
- Você explicou **o que NÃO é defesa**.
- Você explicou **por que o WAF pode piorar**.
- Você escreveu **a recomendação principal**.
- ⚠ **Nenhum serviço de terceiro.**

---

## Avaliação

1. **Por que a defesa não é "corrigir o parser"?**
2. **Cite as quatro defesas** e o que cada uma resolve.
3. **Quais eliminam a classe?** Por quê?
4. **Qual é a defesa ideal?** Por que é rara?
5. **Cite as cinco razões** pelas quais a defesa é difícil.
6. **Por que a spec antiga é estrutural?
7. **Por que o desync é difícil de detectar?
8. **Cite seis regras de detecção.**
9. **Quais não têm falso positivo?** Por quê?
10. **Por que a lentidão é ruim** como sinal?
11. **O que fazer com o alerta de dois `CL`?
12. **Por que monitorar não é defender?
13. **Como medir o efeito de uma defesa?
14. **O que o proxy deve fazer?** Cite três recomendações.
15. **O que o backend deve fazer?
16. **O que o cache deve fazer?
17. **O que NÃO é defesa?** Cite três.
18. **Por que o WAF pode piorar** a situação?
19. **Qual é a recomendação principal?** Por que ela é a única assim?
20. **Como o relatório de defesa difere** do de ataque?

---

**Próximo:** [Módulo 11 — Projeto: do desync ao reporte](modulo-11.md)
