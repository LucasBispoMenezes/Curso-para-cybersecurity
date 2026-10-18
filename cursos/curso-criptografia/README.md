# Criptografia Aplicada e Falhas

Curso de 28 horas, dez módulos. Onde o algoritmo está certo e o sistema quebra.

---

## A linha de progressão

⚠ **Leia esta tabela antes de começar.** Em cada linha, o que você sabe **no módulo 1** e o que
sabe **no módulo 10**.

| | Módulo 1 | Módulo 10 |
|---|---|---|
| **Criptografia** | Usa `openssl` e biblioteca | Sabe **quando a primitiva é a errada** |
| **Aleatoriedade** | Não pensa nisso | Sabe que é a **causa nº 1** de falha real |
| **Modo de operação** | "usa AES" | Sabe por que ECB, CTR e GCM falham **de formas diferentes** |
| **Chave** | "está num arquivo" | KDF, derivação, envelope, rotação, KMS |
| **Hashing** | "senha vai com SHA" | Sabe por que é `argon2`, e o que é MAC |
| **TLS** | "tem cadeado" | Lê certificado, valida cadeia, sabe o que o cadeado **não** diz |
| **Ataque** | Não sabe onde olhar | Reconhece **oracle**, **nonce repetido**, **timing** |
| **Mentalidade** | "o algoritmo é seguro" | **"o protocolo e a implementação é que quebram"** |

**Pré-requisito duro:** curso de **Redes** + saber programar em qualquer linguagem.

---

## A tese

>Cursos de criptografia ensinam RSA e AES. Este ensina **por que o sistema quebra quando RSA e AES estão certos**.

⚠ **A evidência está nos incidentes, não na teoria:**

| Incidente | O que estava certo | O que quebrou |
|---|---|---|
| **WEP** | RC4 | **Reuso de IV** |
| **PS3 / ECDSA** | NIST P-256 | **Nonce repetido** — chave recuperada |
| **Debian OpenSSL 2006** | RSA, DSA | **Entropia removida** |
| **Heartbleed** | TLS, AES | **Leitura fora do buffer** |
| **DROWN** | TLS 1.2 | **Servidor legado com SSLv2** |
| **ROBOT** | RSA | **Oracle de padding** (Bleichenbacher) |
| **JWT `alg: none`** | HMAC | **Validação ausente** |
| **Android `SecureRandom` 2013** | ECDSA | **Entropia insuficiente** — Bitcoin roubado |

⚠ **A coluna do meio é sempre "estava certo".** Nenhum quebrou a primitiva — todos quebraram o que estava em volta.

---

## A trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [O que criptografia aplicada resolve](modulo-01.md) | 2 | A tabela problema → primitiva |
| 2 | [Aleatoriedade](modulo-02.md) | 3 | Detector de fonte fraca |
| 3 | [Cifra simétrica e modo](modulo-03.md) | 4 | Sabe por que cada modo falha |
| 4 | [Chave: derivação e envelope](modulo-04.md) | 3 | Ciclo de vida de chave |
| 5 | [Hash, MAC e assinatura](modulo-05.md) | 3 | Comparação em tempo constante |
| 6 | [TLS de verdade](modulo-06.md) | 3 | Validação de cadeia completa |
| 7 | [**As cinco classes de falha**](modulo-07.md) | 4 | Reconhecimento por leitura |
| 8 | [**Ataque em laboratório próprio**](modulo-08.md) | 3 | Você quebrou a sua própria chave |
| 9 | [Correção e construção segura](modulo-09.md) | 2 | A construção certa para cada caso |
| 10 | [Projeto: revisão de criptografia](modulo-10.md) | 2 | **O relatório completo** |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md)

---

## As cinco classes de falha

⚠ **O reconhecimento que o curso treina.** Marque o que você já sabe identificar:

| # | Classe | Exemplo real | Como se reconhece |
|---|---|---|---|
| 1 | **Oracle** | Padding oracle, Bleichenbacher | **Mensagem de erro distinguível** |
| 2 | **Nonce/IV reusado** | WEP, PS3 ECDSA | Esquema **determinístico** onde devia ser aleatório |
| 3 | **Entropia fraca** | Debian OpenSSL, Android 2013 | Semente de `time()`, `pid`, entropia removida |
| 4 | **Validação ausente** | JWT `alg: none`, certificado não validado | O código **não verifica** o que deveria |
| 5 | **Protocolo** | DROWN, downgrade, ROBOT | A **negociação** permite o que não deveria |

⚠ **As classes 1 e 4 são as mais frequentes em aplicação web.** As classes 2 e 3 são as mais espetaculares. A 5 é a mais difícil de ver, porque **o código de cada lado está certo**.

---

## O laboratório

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv openssl gnutls-bin gcc make curl jq xxd
pip3 install pycryptodome cryptography requests
mkdir -p ~/crypto-lab
```

⚠ **Duas bibliotecas, e o contraste é o curso:**

| Biblioteca | Dá | Uso no curso |
|---|---|---|
| **`pycryptodome`** | Primitive **crua**, inclusive as erradas (`AES.MODE_ECB`) | **Demonstrar a falha** |
| **`cryptography`** | API de **alto nível** (AESGCM, HKDF, argon2) | **A correção** |

⚠ **`openssl` é a terceira** — ler certificado, gerar chave, inspecionar.

---

## ⚠ Nota de propósito

| Você faz | Você **não** faz |
|---|---|
| Quebra **suas** chaves, no **seu** lab | Quebra chave de terceiro |
| Falha **plantada** por você | Falha em produção |
| Oracle no **seu** servidor | Oracle no servidor de outro |
| Lê **o seu** certificado | Intercepta tráfego alheio |

⚠ **Todo o laboratório cabe em `~/crypto-lab/`.** Nada aponta para fora.

⚠ **E aqui a linha importa mais que nos outros cursos:** uma falha de criptografia é **global**.
Um padding oracle bem-sucedido contra serviço real **vaza dado de terceiros** — e o crime não
distingue "testei" de "ataquei".

---

## Como isso conecta

| Curso | Ligação |
|---|---|
| **Redes** | Pré-requisito: TLS, handshake |
| **Linux para Segurança** | Segredo em arquivo, `getrandom`, permissão |
| **C para Segurança** | Timing, comparação, memória |
| **APT e C2** | Certificado de infraestrutura, cifra de canal |
| **Exploit Development** | ASLR é cripto aplicada |

---

## Ritmo

| Bloco | Duração | Módulos |
|---|---|---|
| **Fundamento** | 2 semanas | 1–2 |
| **Simétrica** | 3 semanas | 3–5 |
| **Protocolo** | 2 semanas | 6–7 |
| **Ataque e correção** | 2 semanas | 8–10 |

⚠ **Estimativa a 10 h/semana.** Os módulos 3 e 8 costumam levar mais — o primeiro porque exige
entender **por que** cada modo falha, o segundo porque exige paciência para oráculo.
