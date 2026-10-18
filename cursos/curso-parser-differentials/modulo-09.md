# Módulo 9 — Cadência de Ataque

**Carga:** 3 horas (1h teoria · 2h lab)
**Pré-requisitos:** Módulos 1 a 8

---

## Objetivos

1. Entender a **cadência** como classe — o ritmo do envio como variável.
2. Reconhecer por que o **tempo** é uma dimensão de divergência.
3. Medir a divergência **temporal** entre duas implementações.
4. Distinguir **cadência** de **tempo de execução** e de **timing side-channel**.
5. Classificar quando a cadência é bug e quando é escolha legítima.

---

## ⚠ Antes de começar

⚠ **A afirmação que organiza o módulo:**

> **Até aqui, a divergência era sobre O QUÊ. A cadência é a divergência sobre QUANDO.** **E o
> "quando" também é interpretado — e também diverge.**

⚠ **E o exemplo, que é o mais claro:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ A MESMA SEQUÊNCIA DE BYTES, ENVIADA EM PEDAÇOS                       │
│                                                                      │
│   enviado 1 : "POST / HTTP/1.1\r\n"        → espera 1s               │
│   enviado 2 : "Content-Length: 6\r\n"      → espera 1s               │
│   enviado 3 : "\r\n"                        → espera 1s               │
│   enviado 4 : "AAAAAA"                      → espera 1s               │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ IMPL A: espera o fim do cabeçalho → trata tudo como UMA requisição    │
│ IMPL B: ⚠ tem TIMEOUT de 500ms → trata cada pedaço como uma           │
└──────────────────────────────────────────────────────────────────────┘

⚠ a mesma sequência, enviada devagar, vira DUAS mensagens para B.
```

⚠ **A tese:** **se a implementação decide o que é "uma mensagem" pelo **tempo**, o tempo vira
entrada.** **E duas implementações com timeouts diferentes discordam.**

⚠ **A distinção que este módulo estabelece, e ela é necessária:**

| Classe | O que é | ⚠ Onde mora |
|---|---|---|
| **Framing** (módulo 6) | Onde a mensagem **termina** | Espaço |
| **Cadência** | **Quando** os pedaços chegam | ⚠ **Tempo** |
| Timing side-channel | O que o **tempo de execução** revela | CPU |
| DoS por lentidão | O consumo de recurso | Recurso |

⚠ **A última linha é a nota de conduta do módulo.** **A cadência lenta é a base do **slowloris** —
um ataque de exaustão.** **E é o que você **não** faz contra terceiro:** **o efeito é manter
conexões abertas até o serviço cair.**

⚠ **A regra escrita:**

> **Cadência é entrada, quando o parser a usa para decidir.** **E "quando chega" é tão
> interpretável quanto "o que chegou".**

---

## 9.1 Por que o tempo é uma dimensão

⚠ **Cinco razões pelas quais o tempo entra na interpretação. E as cinco são reais.**

| # | Mecanismo | ⚠ Onde a divergência nasce |
|---|---|---|
| 1 | **Timeout de cabeçalho** | ⚠ Valores diferentes |
| 2 | **Timeout de corpo** | Diferentes |
| 3 | **Timeout de inatividade** | Diferentes |
| 4 | **Tamanho do buffer de leitura** | ⚠ **Um lê 4KB, outro lê o que vier** |
| 5 | **Leitura incremental** | ⚠ Um espera o fim, outro processa já |

⚠ **A linha 4 é a mais subestimada, e a mais técnica.** **Uma implementação que lê em blocos de 4
KB e para no fim do bloco** — **e outra que lê até o fim do que está disponível** — **discordam
sobre onde a leitura terminou.** **Não é tempo; é o **tamanho da leitura** — mas o efeito é o
mesmo.**

⚠ **E a linha 5 é a que gera o caso real.** **Um proxy **streaming** repassa cada pedaço assim que
chega; um servidor **buffering** espera o fim.** **Se o proxy já repassou o cabeçalho e o servidor
reconsidera, há uma janela.**

⚠ **A tabela do efeito, por mecanismo:**

| Mecanismo | Entrada devagar | ⚠ Resultado |
|---|---|---|
| Timeout curto | Pedaços separados | ⚠ **Vira N mensagens** |
| Timeout longo | Pedaços unidos | Uma mensagem |
| Buffer pequeno | Corte no meio | ⚠ **Reinterpretação** |
| Streaming | Repasse imediato | ⚠ Janela de desync |
| Buffering | Espera tudo | Uma decisão |

⚠ **A regra escrita:**

> **O tempo não é um detalhe de transporte.** **Quando a implementação usa timeout para decidir o
> que é uma mensagem, o tempo é dado de entrada** — **e a divergência existe.**

```bash
mkdir -p ~/parser-lab/mod09 && cd ~/parser-lab/mod09

echo "═══ 1. por que o tempo é dimensão ═══"
echo
cat > tempo.md <<'EOF'
# Por que o tempo é uma dimensão

## As cinco razões
| # | Mecanismo | Onde a divergência nasce |
|---|---|---|
| 1 | timeout de CABEÇALHO | valores diferentes |
| 2 | timeout de CORPO | diferentes |
| 3 | timeout de INATIVIDADE | diferentes |
| 4 | ⚠ BUFFER de leitura | um lê 4KB, outro lê o que vier |
| 5 | ⚠ leitura INCREMENTAL | um espera o fim, outro já processa |

## O efeito
| Mecanismo | Entrada devagar | Resultado |
|---|---|---|
| timeout curto | pedaços separados | ⚠ vira N mensagens |
| timeout longo | pedaços unidos | uma mensagem |
| buffer pequeno | corte no meio | ⚠ reinterpretação |
| streaming | repasse imediato | ⚠ janela de desync |
| buffering | espera tudo | uma decisão |

## ⚠ as quatro classes (não confundir)
| Classe | O que é | Onde mora |
|---|---|---|
| FRAMING (módulo 6) | onde termina | espaço |
| ⚠ CADÊNCIA | QUANDO os pedaços chegam | tempo |
| timing side-channel | o que o tempo de EXECUÇÃO revela | CPU |
| DoS por lentidão | o consumo de recurso | recurso |

## ⚠ A REGRA
o tempo não é detalhe de transporte.
quando a implementação usa timeout para decidir o que é uma mensagem,
o tempo é DADO DE ENTRADA.
EOF

cat tempo.md

echo
echo "═══ 2. as quatro classes, separadas ═══"
echo
cat <<'EXPL'
  ⚠ SÃO COISAS DIFERENTES. NÃO CONFUNDA.

  ── FRAMING (módulo 6) ──
     · pergunta: ONDE a mensagem termina?
     · a entrada é ESPAÇO (os bytes)
     · ✓ é o que este curso cobre como bug

  ── CADÊNCIA (este módulo) ──
     · pergunta: QUANDO os pedaços chegam?
     · a entrada é TEMPO
     · ⚠ e a implementação usa timeout para DECIDIR
     · ✓ a divergência é de configuração, não de código

  ── TIMING SIDE-CHANNEL ──
     · pergunta: o que o tempo de EXECUÇÃO revela?
     · é o curso de Side-Channel
     · ⚠ e o alvo é a informação, não o parsing
     · ✗ NÃO é este curso

  ── DoS POR LENTIDÃO ──
     · pergunta: quanto recurso eu consumo?
     · é o slowloris
     · ⚠ e o efeito é a NEGAÇÃO, não a divergência
     · ⚠ **NÃO FAÇA CONTRA TERCEIRO** — é crime

  ✓ este módulo cobre a CADÊNCIA como diverGÊNCIA.
     ⚠ e não cobre exaustão, que é outro assunto — e outra linha.
EXPL
```

⚠ **A separação das quatro classes é o instrumento.** **E ela evita a confusão mais comum:**
**"lento" não é o mesmo que "divergente".**

⚠ **E a nota da última classe é a conduta.** **O slowloris é exaustão de recurso** — **e o efeito é
o serviço cair.** **A cadência lenta, contra terceiro, é isso.** **No lab, é didático.**

**Produza `tempo.md`:**

| # | Mecanismo | Onde diverge |
|---|---|---|
| 1 | | |
| 4 | | |
| 5 | | |

**Responda:**

1. **Qual mecanismo é o mais subestimado?** Por quê?
2. **O que o buffer de leitura muda?**
3. **Qual a diferença entre cadência e timing side-channel?**
4. **Por que o slowloris é outra linha?**

---

## 9.2 Medindo a divergência temporal

⚠ **A medição: **a mesma sequência, enviada em cadências diferentes, e o que cada parser faz.****

| Medição | Como | ⚠ Sinal |
|---|---|---|
| **N de mensagens** | Contar | ⚠ Difere com a cadência |
| **Momento do corte** | Logar o tempo | ⚠ Onde B parou |
| **O que sobrou** | Bytes após o corte | ⚠ Vira próxima mensagem |
| O veredito | Erro vs. sucesso | ⚠ Difere |

⚠ **A tabela da matriz temporal — e ela é o instrumento:**

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ CADÊNCIA     │ IMPL A       │ IMPL B       │ DISCORDAM?   │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ tudo junto   │ 1 mensagem   │ 1 mensagem   │ não          │
│ 100ms/pedaço │ 1 mensagem   │ 1 mensagem   │ não          │
│ 600ms/pedaço │ 1 mensagem   │ ⚠ 2 mensagens│ ⚠ SIM         │
│ 2s/pedaço    │ ⚠ 0 (timeout) │ ⚠ N mensagens│ ⚠ SIM         │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

⚠ **A linha 3 é o ponto exato.** **Há uma cadência em que as duas discordam** — **e ela está no
intervalo entre os dois timeouts.** **Encontrar esse intervalo é a medição.**

⚠ **E a linha 4 mostra o outro extremo.** **Devagar demais e a implementação estrita desiste
completamente** — **e o resultado é "0 mensagens" contra "N".** **É a mesma divergência, com outro
efeito.**

⚠ **A regra escrita:**

> **A divergência temporal existe num intervalo.** **Você o encontra varrendo a cadência** — **e o
> achado é o intervalo, não um valor.**

```bash
cd ~/parser-lab/mod09

echo "═══ 3. a matriz temporal ═══"
echo
cat > matriz-temporal.md <<'EOF'
# A matriz temporal

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ CADÊNCIA     │ IMPL A       │ IMPL B       │ DISCORDAM?   │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ tudo junto   │ 1 mensagem   │ 1 mensagem   │ não          │
│ 100ms/pedaço │ 1 mensagem   │ 1 mensagem   │ não          │
│ 600ms/pedaço │ 1 mensagem   │ ⚠ 2 mensagens│ ⚠ SIM         │
│ 2s/pedaço    │ ⚠ 0 (timeout) │ ⚠ N mensagens│ ⚠ SIM         │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

## O que medir
| Medição | Como | Sinal |
|---|---|---|
| N de mensagens | contar | ⚠ difere com a cadência |
| momento do corte | logar o tempo | ⚠ onde B parou |
| o que sobrou | bytes após o corte | ⚠ vira a próxima |
| o veredito | erro × sucesso | ⚠ difere |

## ⚠ o achado é o INTERVALO
há uma cadência em que as duas discordam —
e ela está ENTRE os dois timeouts.
✓ você varre a cadência e encontra o intervalo.
   o achado não é um valor — é o intervalo.

## ⚠ A REGRA
a divergência temporal existe num INTERVALO.
você o encontra VARRENDO a cadência.
EOF

cat matriz-temporal.md

echo
echo "═══ 4. dois parsers com timeouts diferentes ═══"
echo
cat > parser_estrito.py <<'PY'
#!/usr/bin/env python3
"""
parser_estrito.py — impl A: timeout CURTO de cabeçalho.

⚠ DIDÁTICO. lê de um socket LOCAL.
"""
import socket, sys

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 9100
TIMEOUT_CABECALHO = 0.5     # ⚠ meio segundo


def main():
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT)); s.listen(5)
    print(f"═══ PARSER ESTRITO em {HOST}:{PORT} ═══")
    print(f"  timeout de cabeçalho: {TIMEOUT_CABECALHO}s")
    print("  ⚠ local, didático.")
    print()
    while True:
        cli, _ = s.accept()
        cli.settimeout(TIMEOUT_CABECALHO)
        try:
            dados = b""
            try:
                while b"\r\n\r\n" not in dados:
                    b = cli.recv(1)
                    if not b: break
                    dados += b
            except socket.timeout:
                print(f"  [A] ⚠ TIMEOUT após {len(dados)}B — desistiu", flush=True)
                cli.close(); continue
            print(f"  [A] ✓ cabeçalho completo ({len(dados)}B) — 1 requisição", flush=True)
        except Exception:
            pass
        cli.close()


if __name__ == "__main__":
    main()
PY

cat > parser_tolerante.py <<'PY'
#!/usr/bin/env python3
"""
parser_tolerante.py — impl B: timeout LONGO de cabeçalho.

⚠ DIDÁTICO. lê de um socket LOCAL.
"""
import socket, sys

HOST, PORT = "127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 9101
TIMEOUT_CABECALHO = 5.0     # ⚠ cinco segundos


def main():
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT)); s.listen(5)
    print(f"═══ PARSER TOLERANTE em {HOST}:{PORT} ═══")
    print(f"  timeout de cabeçalho: {TIMEOUT_CABECALHO}s")
    print("  ⚠ local, didático.")
    print()
    while True:
        cli, _ = s.accept()
        cli.settimeout(TIMEOUT_CABECALHO)
        try:
            dados = b""
            try:
                while b"\r\n\r\n" not in dados:
                    b = cli.recv(1)
                    if not b: break
                    dados += b
            except socket.timeout:
                print(f"  [B] ⚠ timeout após {len(dados)}B", flush=True)
                cli.close(); continue
            print(f"  [B] ✓ cabeçalho completo ({len(dados)}B) — 1 requisição", flush=True)
        except Exception:
            pass
        cli.close()


if __name__ == "__main__":
    main()
PY

chmod +x parser_estrito.py parser_tolerante.py

echo "  ── os dois prontos ──"
printf '     A: timeout %.1fs\n' 0.5
printf '     B: timeout %.1fs\n' 5.0
echo
echo "  ⚠ a divergência aparece numa cadência ENTRE os dois timeouts."
echo "     ✓ com pedaços a cada 1s, A desiste e B não."
```

⚠ **Dois parsers com timeouts diferentes são o instrumento mínimo.** **E a divergência é
configuração, não código** — **o que muda o tipo de achado e o destinatário do reporte.**

⚠ **E a lição é o intervalo:** **a 600ms, os dois aceitam; a 2s, só B.** **Você encontra a cadência
onde eles discordam.**

**Produza `parsers-tempo.md`:**

| Parser | Timeout | Comportamento |
|---|---|---|
| A | | |
| B | | |

**Responda:**

1. **Qual é o timeout de cada?**
2. **Em qual cadência eles discordam?**
3. **A divergência é de código ou de configuração?**
4. **Quem corrige isso?** (Dica: não é só o código.)

---

## 9.3 Quando a cadência é bug

⚠ **O critério, com a cascata do módulo 3 aplicada ao tempo.**

| Pergunta | Aplicação |
|---|---|
| **Q1 — a spec decide?** | ⚠ A spec **não** especifica timeout |
| **Q2 — as duas seguem?** | ⚠ **Não há spec a seguir** |
| **Q3 — quais violam?** | ⚠ Nenhuma, em relação à spec |

⚠ **O resultado é desconfortável, e é a conclusão do módulo:** **a cadência **não** cai na categoria
3 pelo critério do módulo 3.** **Não há spec violada** — **porque a spec não fala de timeout.**

⚠ **E então a classificação correta é categoria 2 — ambiguidade da spec** — **e o destino não é o
mantenedor, é a especificação.** **Mas há uma diferença importante:**

| Tipo de bug | Destino | ⚠ Efeito |
|---|---|---|
| Categoria 2 (spec omite) | O dono do formato | ⚠ Especular |
| ⚠ **Categoria 2 + consequência** | ⚠ **Os dois mantenedores** | ⚠ **Prático** |

⚠ **A segunda linha é a que o módulo defende.** **A spec omite, mas a omissão **produz um efeito**:
duas implementações que discordam sobre o que é uma mensagem.** **E aí o problema deixa de ser
acadêmico — é uma interoperabilidade quebrada com consequência de segurança.**

⚠ **A tabela do que reportar, por situação:**

| Situação | Reporte a | Por quê |
|---|---|---|
| Cadência causa mensagem extra | ⚠ **Os dois** | Interop desync |
| Cadência causa recusa | Os dois | Interop |
| Cadência só atrasa | ⚠ Ninguém | Sem efeito |
| A spec não fala de timeout | ⚠ **Também à spec** | A omissão é a raiz |

⚠ **A última linha é a contribuição original.** **Você reporta a omissão à especificação** — **e o
efeito aos mantenedores.** **É o mesmo padrão do módulo 10 do Patch Diffing, com um destinatário a
mais.**

⚠ **A regra escrita:**

> **A spec omite o timeout.** **Mas a omissão produz uma discordância observável** — **e é a
> discordância que você reporta, não a omissão sozinha.**

```bash
cd ~/parser-lab/mod09

echo "═══ 5. quando a cadência é bug ═══"
echo
cat > criterio.md <<'EOF'
# Quando a cadência é bug

## A cascata aplicada ao tempo
| Pergunta | Aplicação |
|---|---|
| Q1 — a spec decide? | ⚠ a spec NÃO especifica timeout |
| Q2 — as duas seguem? | ⚠ não há spec a seguir |
| Q3 — quais violam? | ⚠ nenhuma, em relação à spec |

## ⚠ o resultado é desconfortável
a cadência NÃO cai na categoria 3 pelo critério do módulo 3.
não há spec violada — porque a spec não fala de timeout.

## Mas há uma diferença
| Tipo | Destino | Efeito |
|---|---|---|
| categoria 2 pura (spec omite) | o dono do formato | ⚠ especular |
| ⚠ categoria 2 + CONSEQUÊNCIA | ⚠ os DOIS mantenedores | ⚠ prático |

## Por situação
| Situação | Reporte a | Por quê |
|---|---|---|
| cadência causa mensagem extra | ⚠ OS DOIS | interop desync |
| cadência causa recusa | os dois | interop |
| cadência só atrasa | ⚠ NINGUÉM | sem efeito |
| a spec não fala de timeout | ⚠ também à spec | a omissão é a raiz |

## ⚠ A REGRA
a spec omite o timeout.
mas a omissão PRODUZ uma discordância observável.
✓ você reporta a DISCORDÂNCIA — não a omissão sozinha.
EOF

cat criterio.md

echo
echo "═══ 6. e o limite de conduta ═══"
cat <<'EXPL'
  ⚠ A CADÊNCIA TEM DOIS USOS. E ELES SÃO DIFERENTES.

  ── USO 1: MEDIR A DIVERGÊNCIA (este curso) ──
     · manda a sequência em cadências diferentes
     · ⚠ conta quantas mensagens cada parser vê
     · ✓ o objetivo é a INTEROP, não a exaustão
     · ✓ e é no SEU lab

  ── USO 2: EXAURIR O RECURSO (o slowloris) ──
     · mantém N conexões abertas, devagar
     · ⚠ o objetivo é o serviço cair
     · ⚠ **É CRIME CONTRA TERCEIRO**
     · ✗ NÃO é este curso

  ── A LINHA, EM UMA FRASE ──
     ⚠ "a cadência mede a divergência; a lentidão exaure o recurso."
     ✓ a primeira é pesquisa. a segunda é ataque.

  ── E O SINAL PRÁTICO ──
     · você está contando MENSAGENS?        → ✓ pesquisa
     · ⚠ você está contando CONEXÕES ABERTAS? → ⚠ pare
EXPL
```

⚠ **A distinção dos dois usos é a conduta do módulo.** **E o sinal prático é preciso:** **se você
está contando **mensagens**, é pesquisa; se está contando **conexões abertas**, pare.**

⚠ **E é a mesma linha do módulo 8 do Patch Diffing:** **reproduzir versus explorar.** **Aqui, medir
a divergência versus exaurir o serviço.**

**Produza `criterio.md`:**

| Situação | Reporte a |
|---|---|
| Mensagem extra | |
| Só atrasa | |
| Spec omite | |

**Responda:**

1. **A cadência cai na categoria 3?** Por quê não?
2. **O que a torna prática mesmo assim?**
3. **A quem reportar a omissão da spec?**
4. **Qual o sinal prático** entre pesquisa e ataque?

---

## 9.4 LAB — A divergência temporal

**Duração:** 120 min

### Passo 1 — Suba os dois parsers (40 min)

```bash
cd ~/parser-lab/mod09

echo "═══ SUBINDO OS DOIS ═══"
echo
cat <<'EXPL'
  ── DOIS TERMINAIS ──

     python3 parser_estrito.py   9100     # timeout 0.5s
     python3 parser_tolerante.py 9101     # timeout 5.0s

  ── ⚠ E O CLIENTE QUE VARRE A CADÊNCIA ──
     (o script abaixo)
EXPL

cat > varre-cadencia.py <<'PY'
#!/usr/bin/env python3
"""
varre-cadencia.py — manda a MESMA sequência em CADÊNCIAS diferentes
e observa o que cada parser faz.

⚠ DIDÁTICO e LOCAL. 127.0.0.1 apenas.
   o objetivo é medir a DIVERGÊNCIA, não exaurir recurso.
"""
import socket, sys, time

# ─── a sequência, em pedaços ───
PEDACOS = [
    b"POST / HTTP/1.1\r\n",
    b"Host: localhost\r\n",
    b"Content-Length: 6\r\n",
    b"\r\n",
    b"AAAAAA",
]

CADENCIAS = [0.0, 0.1, 0.3, 0.6, 1.0]     # segundos entre pedaços


def manda(porta: int, intervalo: float):
    """manda a sequência com o intervalo dado; retorna o tempo total"""
    t0 = time.time()
    try:
        with socket.create_connection(("127.0.0.1", porta), timeout=8) as s:
            for p in PEDACOS:
                s.sendall(p)
                if intervalo:
                    time.sleep(intervalo)
            # espera um pouco pela resposta do parser
            time.sleep(0.2)
            s.settimeout(1)
            try:
                s.recv(4096)          # ⚠ só para dar tempo ao log
            except Exception:
                pass
        return time.time() - t0
    except Exception as e:
        return f"({type(e).__name__})"


def main():
    print("═══ VARREDURA DE CADÊNCIA ═══")
    print()
    print("  ⚠ alvo: 127.0.0.1 (LOCAL) — nunca externo")
    print("  ⚠ objetivo: MEDIR a divergência, não exaurir")
    print()
    print(f"  {'intervalo':<12} {'A (0.5s)':<14} {'B (5.0s)':<14} tempo")
    print("  " + "-"*56)

    for intervalo in CADENCIAS:
        # ⚠ envia para os DOIS, com o mesmo intervalo
        ta = manda(9100, intervalo)
        tb = manda(9101, intervalo)
        print(f"  {intervalo:<12.1f} {'enviado':<14} {'enviado':<14} A={ta:.2f}s B={tb:.2f}s")

    print()
    print("  ═══ COMO LER ═══")
    print("  ⚠ os logs dos parsers estão nos outros terminais.")
    print("     · com 0.0s  → os dois veem o cabeçalho completo")
    print("     · com 0.6s  → ⚠ A pode desistir e B não  ← O INTERVALO")
    print("     · com 1.0s  → ⚠ A desiste, B espera")
    print()
    print("  ✓ e o achado é o INTERVALO onde eles discordam.")


if __name__ == "__main__":
    main()
PY

chmod +x varre-cadencia.py

echo "  ── o script está pronto ──"
echo
echo "  ── PARA RODAR ──"
cat <<'EXPL'
     # terminal 1
     python3 parser_estrito.py 9100

     # terminal 2
     python3 parser_tolerante.py 9101

     # terminal 3
     python3 varre-cadencia.py
EXPL
```

⚠ **A varredura é o instrumento.** **E o resultado é o **intervalo** — não um valor.** **Entre 0.5s
e 5.0s, há cadências em que A desiste e B não.**

⚠ **E note que os dois recebem a mesma sequência.** **A diferença é só o **quando**.** **É a
definição de divergência temporal.**

**Produza `varredura.md`:**

| Intervalo | A | B | Discordam? |
|---|---|---|---|
| 0.0s | | | |
| 0.6s | | | |
| 1.0s | | | |

**Responda:**

1. **Em qual intervalo os dois discordam?**
2. **O que A faz e B não?**
3. **A sequência é a mesma?** Só o tempo muda?
4. **O objetivo é a divergência ou o consumo?** Confirme.

### Passo 2 — Meça e classifique (50 min)

⚠ **A medição e a classificação — a cascata com o resultado desconfortável.**

```bash
cd ~/parser-lab/mod09

echo "═══ MEDINDO E CLASSIFICANDO ═══"
echo
cat > caderno/PD-009.md <<'EOF'
# PD-009 — divergência temporal

**Data:** ____

## 1. Os parsers
| Parser | Timeout | Porta |
|---|---|---|
| A (estrito) | ⚠ 0.5s | 9100 |
| B (tolerante) | ⚠ 5.0s | 9101 |

## 2. O isolamento
| Item | Valor |
|---|---|
| endereços | 127.0.0.1 |
| rede de saída | ⚠ NENHUMA |
| ⚠ objetivo | MEDIR divergência, não exaurir |

## 3. A varredura
| Intervalo | A viu | B viu | Discordam? |
|---|---|---|---|
| 0.0s | | | |
| 0.1s | | | |
| 0.3s | | | |
| 0.6s | | | |
| 1.0s | | | |

## 4. ⚠ O INTERVALO de divergência
| Item | Valor |
|---|---|
| Entre | ____s e ____s |
| O que A faz | |
| O que B faz | |
| A mesma sequência? | ✓ sim — só o tempo muda |

## 5. A evidência literal
```
[A]
[B]
```

## 6. A classificação (módulo 3)
| Pergunta | Resposta |
|---|---|
| Q1 — a spec decide? | ⚠ NÃO (a spec não fala de timeout) |
| Q2 — as duas seguem? | ⚠ não há spec a seguir |
| Q3 — quais violam? | nenhuma, em relação à spec |
| ⚠ Categoria | categoria 2 + CONSEQUÊNCIA |

## 7. A consequência objetiva (módulo 3.3)
| Item | Valor |
|---|---|
| O que a discordância produz | |
| Mensagem extra? | |
| Recusa? | |

## 8. A quem reportar
| Destinatário | O quê |
|---|---|
| o parser A | a configuração? |
| o parser B | a configuração? |
| ⚠ a SPEC | a omissão do timeout |

## 9. ⚠ O que eu NÃO fiz
- [ ] não apontei para serviço de terceiro
- [ ] não mantive conexões abertas para exaurir
- [ ] não testei produto real
- [ ] não publiquei nada

## 10. O que NÃO foi verificado
⚠ mínimo 3
EOF

cat caderno/PD-009.md | head -34
```

⚠ **A ficha registra a classificação desconfortável.** **E ela é a contribuição do módulo:** **a
cadência é categoria 2 — mas com consequência, e a consequência muda o destinatário.**

⚠ **E a linha 9 é a conduta.** **Contar mensagens é pesquisa; manter conexões é exaustão.** **A
ficha registra qual dos dois você fez.**

**Produza `classificacao-temporal.md`:**

| Pergunta | Resposta |
|---|---|
| Q1 — a spec decide? | |
| Q2 — as duas seguem? | |
| Categoria | |
| Destinatários | |

**Responda:**

1. **Em qual intervalo está a divergência?**
2. **Qual a categoria?** Por que não é 3?
3. **Qual a consequência objetiva?**
4. **A quem reportar?** Quantos destinatários?

### Passo 3 — Documente (30 min)

Produza `relatorio-temporal.md`:

```markdown
# Relatório — divergência temporal

## 1. Os componentes
| Componente | Versão | Timeout | Ambiente |
|---|---|---|---|
| A | | | |
| B | | | |

## 2. A entrada
| Item | Valor |
|---|---|
| Bytes totais | |
| Como foi dividida | 5 pedaços |
| ⚠ O que varia | só o INTERVALO |

## 3. A varredura
| Intervalo | A | B | Discordam? |
|---|---|---|---|
| | | | |

## 4. ⚠ O intervalo de divergência
| Item | Valor |
|---|---|
| Entre | |
| O efeito | |
| A mesma sequência? | **sim — só o tempo muda** |

## 5. A evidência literal
```
comando
```
```
log de A
```
```
log de B
```

## 6. A classificação
| Item | Valor |
|---|---|
| Categoria | ⚠ 2 (a spec omite) + consequência |
| Por que não é 3 | não há spec violada |
| Por que ainda importa | a omissão produz discordância observável |

## 7. A quem reportar
| Destinatário | O que |
|---|---|
| parser A | a configuração de timeout |
| parser B | a configuração de timeout |
| ⚠ a especificação | a omissão produz interop desync |

## 8. ⚠ O que eu NÃO fiz
- [ ] não apontei para terceiro
- [ ] não mantive conexões para exaurir
- [ ] não testei em produção
- [ ] não calculei severidade

## 9. O que cada mantenedor confirma
| # | Dono | Item |
|---|---|---|
| 1 | A | 0.5s é intencional? |
| 2 | B | 5s é intencional? |
| 3 | a spec | a omissão é conhecida? |

## 10. O que NÃO foi verificado
⚠ mínimo 3
```

**Produza `relatorio-temporal.md`:**

| Item | Valor |
|---|---|
| Intervalo | |
| Categoria | |
| Destinatários | |
| **O que não fiz** | |

**Responda:**

1. **O relatório registra que só o tempo mudou?**
2. **Ele distingue o que reportar a cada destinatário?**
3. **Ele declara que não exauriu recurso?**
4. **Por que a spec é um destinatário aqui?**

### Critérios de aceitação

- `tempo.md` com as **cinco** razões e o efeito de cada.
- Você explicou **por que o buffer de leitura é o mais subestimado**.
- As **quatro classes** separadas (framing, cadência, timing, DoS).
- Você explicou **o que separa cadência de timing side-channel**.
- Você explicou **por que o slowloris é outra linha**.
- `matriz-temporal.md` com a matriz de cadências.
- Você explicou **por que o achado é um intervalo**, não um valor.
- `parser_estrito.py` e `parser_tolerante.py` com timeouts declarados.
- Você explicou **se a divergência é de código ou de configuração**.
- Você explicou **quem corrige isso**.
- `criterio.md` com a cascata aplicada ao tempo.
- Você explicou **por que a cadência não é categoria 3**.
- Você explicou **o que a torna prática mesmo assim**.
- Os **dois usos** da cadência distinguidos, com o sinal prático.
- `varre-cadencia.py` rodado, **com a varredura de intervalos**.
- Você identificou **o intervalo de divergência**.
- Você confirmou que **a sequência é a mesma** — só o tempo muda.
- `caderno/PD-009.md` com as **dez** seções.
- `relatorio-temporal.md` com os **três** destinatários distintos.
- ⚠ **Nenhum serviço de terceiro.** Nenhuma exaustão de recurso.

---

## Avaliação

1. **O que mudou em relação ao módulo 6?**
2. **Cite as cinco razões** pelas quais o tempo entra na interpretação.
3. **Qual é a mais subestimada?** Por quê?
4. **O que o tamanho do buffer muda?**
5. **O que o streaming muda?** E o buffering?
6. **Cite as quatro classes** e onde cada uma mora.
7. **O que separa cadência de timing side-channel?**
8. **O que separa cadência de DoS por lentidão?**
9. **Por que o slowloris é outra linha?**
10. **Cite quatro medições de divergência temporal.**
11. **O que a matriz temporal mostra?**
12. **Por que o achado é um intervalo**, e não um valor?
13. **Em qual região o intervalo está?**
14. **A divergência é de código ou de configuração?** Por que importa?
15. **Quem corrige um timeout?**
16. **Como a cascata do módulo 3 se aplica ao tempo?**
17. **Qual categoria é a cadência?** Por que não é 3?
18. **O que a torna prática mesmo sendo categoria 2?**
19. **A quem reportar uma omissão de spec?**
20. **Qual o sinal prático** entre pesquisa e exaustão?

---

**Próximo:** [Módulo 10 — Projeto: da divergência ao reporte](modulo-10.md)
