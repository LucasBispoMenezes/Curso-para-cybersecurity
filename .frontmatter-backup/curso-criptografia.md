---
title: Criptografia Aplicada e Falhas: Onde o Algoritmo Esta Certo e o Sistema Quebra
nivel: intermediario
tags: [criptografia, aes, tls, kdf, nonce, padding-oracle]
---# Criptografia Aplicada e Falhas: Onde o Algoritmo Está Certo e o Sistema Quebra

**Ementa do curso · 28 horas · 10 módulos · PT-BR com termos técnicos em inglês**

---

## Progressão — o que você sabe antes e depois

| | No módulo 1 | No último módulo |
|---|---|---|
| **Criptografia** | Usa `openssl` e biblioteca | Sabe **quando a primitiva é a errada** |
| **Aleatoriedade** | Não pensa nisso | Sabe que é a **causa nº 1** de falha real |
| **Modo de operação** | "usa AES" | Sabe por que ECB, CTR e GCM falham de formas diferentes |
| **Chave** | "está num arquivo" | Sabe o que é KDF, derivação, rotação e envelope |
| **Hashing** | "senha vai com SHA" | Sabe por que é `bcrypt`/`argon2`, e o que é MAC |
| **TLS** | "tem cadeado" | Lê certificado, valida cadeia, e sabe o que o cadeado **não** diz |
| **Ataque** | Não sabe onde olhar | Reconhece **oracle de padding**, **reuso de nonce**, **timing** |
| **Mentalidade** | "o algoritmo é seguro" | **"o protocolo e a implementação é que quebram"** |

**Pré-requisito duro:** curso de **Redes** (TLS, TCP) e saber programar em qualquer linguagem.
**Ajuda muito:** curso de **C para Segurança** (timing, memória) e **Linux para Segurança**
(segredo em arquivo, `/dev/urandom`, permissão).

---

## Por que este curso existe

⚠ **A frase que organiza o curso inteiro:**

> **Ninguém quebra AES. Quebram o modo de operação, o gerenciamento de chave, a
> aleatoriedade, o protocolo, ou a validação.**

⚠ **E a evidência está nos incidentes reais, não na teoria:**

| Incidente | O que estava certo | O que quebrou |
|---|---|---|
| **WEP** | RC4 | **Reuso de IV** — mesmo fluxo de chave |
| **PS3 / ECDSA** | Curva NIST P-256 | **Nonce repetido** — chave privada recuperada |
| **Debian OpenSSL 2006** | RSA, DSA | **Entropia removida** — chaves previsíveis |
| **Heartbleed** | TLS, AES | **Leitura fora do buffer** — chave vazada |
| **DROWN** | TLS 1.2 | **Servidor legado com SSLv2** |
| **ROBOT** | RSA | **Oracle de padding** — Bleichenbacher |
| **Padding oracle (ASP.NET)** | AES-CBC | **Erro distinguível** — plaintext recuperado |
| **JWT `alg: none`** | HMAC | **Validação ausente** — bypass |
| **Android `SecureRandom` 2013** | ECDSA | **Entropia insuficiente** — Bitcoin roubado |
| **Junos / CVE de RNG** | IPSec | **Semente fraca** — tráfego descriptografável |

⚠ **A coluna do meio é sempre "estava certo".** Nenhum desses casos quebrou a primitiva — todos
quebraram **o que estava em volta dela**.

⚠ **A tese do curso:**

> **Criptografia aplicada não é sobre matemática. É sobre saber onde a matemática é cercada por
> código, protocolo e configuração — e que é ali que a falha mora.**

⚠ **E o alvo do curso é o profissional que usa criptografia**, não o matemático. Você vai
**reconhecer** a falha, **demonstrar** em laboratório próprio, e **corrigir** com a construção
certa.

---

## ⚠ Nota de propósito e conduta

⚠ **Criptografia é a área onde "demonstrar o ataque" é mais próximo de "atacar de verdade"** — porque
a falha frequentemente é **global**. Um padding oracle que você explora contra o cliente do vizinho
é um ataque real.

| Este curso faz | **Não** faz |
|---|---|
| Quebra **suas** chaves, no **seu** laboratório | Quebra chave de terceiro |
| Falha **plantada** por você | Falha em sistema em produção |
| Lê **o seu** certificado | Intercepta tráfego alheio |
| Demonstra oracle no **seu** servidor | Oracle no servidor de outro |
| Escreve correção | Escreve ataque a alvo real |
| Timing em **função sua** | Timing contra serviço alheio |

⚠ **O laboratório todo cabe em `~/crypto-lab/`** — servidores locais, chaves geradas por você,
falhas plantadas por você. **Nada aponta para fora.**

⚠ **E a linha que o curso repete, porque aqui é onde ela mais importa:**

> **Criptografia quebrada é falha de segurança global.** Diferente de uma má configuração de
> servidor, um padding oracle bem-sucedido contra um serviço real **vaza dados de terceiros** — e
> o crime não distingue "testei" de "ataquei".

---

## Objetivos de aprendizagem

Ao final, você será capaz de:

1. Reconhecer a **primitiva errada** para o problema, antes de escrever código.
2. Avaliar a **fonte de aleatoriedade** e detectar quando ela é insuficiente.
3. Escolher modo de operação e **explicar por que os outros falham**.
4. Distinguir hash de senha, MAC, KDF e assinatura — e o que cada um resolve.
5. Aplicar o padrão de **construção autenticada** (Encrypt-then-MAC, AEAD).
6. Ler um certificado e validar a cadeia — e saber o que o cadeado **não** prova.
7. Reconhecer as **cinco classes de falha** que produzem incidentes reais.
8. Demonstrar padding oracle, reuso de nonce e timing **em laboratório próprio**.
9. Corrigir cada classe com a construção adequada.
10. Produzir revisão de criptografia com achado e correção testada.

---

## Estrutura

| # | Módulo | Foco | Horas |
|---|---|---|---|
| 1 | O que criptografia aplicada resolve — e o que não resolve | Os quatro problemas, a primitiva certa | 2 |
| 2 | Aleatoriedade: a causa nº 1 | CSPRNG, entropia, semente, `getrandom` | 3 |
| 3 | Cifra simétrica e modo de operação | ECB, CBC, CTR, GCM — e por que cada um falha | 4 |
| 4 | Chave: derivação, troca, envelope, rotação | KDF, ECDH, envelope, KMS, ciclo de vida | 3 |
| 5 | Hash, MAC e assinatura | SHA-2/3, HMAC, AEAD, Ed25519, tempo constante | 3 |
| 6 | TLS de verdade | Cadeia, validação, pinning, HSTS, downgrade | 3 |
| 7 | As cinco classes de falha | Oracle, nonce, entropia, validação, protocolo | 4 |
| 8 | Ataque em laboratório próprio | Padding oracle, nonce, timing, downgrade | 3 |
| 9 | Correção e construção segura | A construção certa para cada problema | 2 |
| 10 | Projeto: revisão de criptografia | O relatório com achado e correção | 2 |

Cada módulo: teoria → **demonstração com saída real** → lab → avaliação. ~60% prática.

---

## O laboratório

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv openssl \
                    gnutls-bin crypto-policies \
                    gcc make curl jq xxd
pip3 install pycryptodome cryptography requests

mkdir -p ~/crypto-lab && cd ~/crypto-lab
python3 -c "from Crypto.Cipher import AES; from cryptography.hazmat.primitives.ciphers.aead import AESGCM; print('✓ pycryptodome + cryptography')"
```

⚠ **Duas bibliotecas por um motivo didático.** `pycryptodome` dá acesso **cru** às primitivas —
inclusive às **erradas** (`AES.MODE_ECB`), que é como você demonstra a falha. `cryptography` dá a
**API de alto nível** — a construção certa, que é a correção. **O contraste é o curso.**

⚠ **E `openssl` é a ferramenta de linha de comando** — para ler certificado, gerar chave, e
inspecionar o que a biblioteca está fazendo.

---

## Critérios de avaliação

| Instrumento | Peso | O que mede |
|---|---|---|
| Labs por módulo (10) | 55% | Código que roda, saída real, interpretação |
| Demonstração de falha (módulo 8) | 15% | Você quebrou a sua própria chave |
| Correção testada (módulo 9) | 10% | Prova que a construção certa resolve |
| Projeto (módulo 10) | 20% | Revisão completa, com achado e correção |

**Rubrica central:** você não entrega "usei AES". Você entrega **a construção**, **a demonstração
da falha da construção errada**, e **a prova de que a certa resolve**.

---

## Como este curso se conecta aos outros

| Curso | Ligação |
|---|---|
| **Redes** | Pré-requisito: TLS, handshake, TCP |
| **Linux para Segurança** | Segredo em arquivo, `/dev/urandom`, permissão, `getrandom` |
| **C para Segurança** | Timing, comparação em tempo não constante, memória |
| **Exploit Development** | ROP com endereço aleatorizado (ASLR é cripto aplicada) |
| **Malware** | Cifra de C2, chave embutida, ofuscação |
| **APT e C2** | Cifra de canal, certificado de infraestrutura |
| **Fuzzing** | Alvo que faz parsing de dado criptográfico |

⚠ **Este curso fecha a lacuna de três.** TLS aparece em redes, em APT e em exploit — e nenhum
deles ensina **por que o cadeado pode estar certo e o sistema não**.

---

## Referências abertas

- **NIST SP 800-38A–38D** — modos de operação, incluindo GCM
- **NIST SP 800-90A/B/C** — geradores de aleatoriedade
- **NIST SP 800-108 / 800-56A** — derivação de chave, acordo de chave
- **NIST SP 800-131A / 800-57** — força de chave e ciclo de vida
- **RFC 8446** — TLS 1.3 · **RFC 5280** — certificado X.509
- **RFC 8017** — RSA (PKCS#1) · **RFC 8032** — EdDSA
- **RFC 5116** — AEAD · **RFC 5869** — HKDF
- **OWASP Cryptographic Storage Cheat Sheet**
- **"Serious Cryptography"** — Jean-Philippe Aumasson
- **"Cryptography Engineering"** — Ferguson, Schneier, Kohno
- **"Real-World Cryptography"** — David Wong
- **"Bulletproof TLS and PKI"** — Ivan Ristić
- **Crypto101** — https://www.crypto101.io/ (livre)
- **Boneh-Shoup "A Graduate Course in Applied Cryptography"** — livre
- **Cryptopals** — https://cryptopals.com/ (exercícios, e o melhor treino de falha real)
- **Bleichenbacher, "Chosen Ciphertext Attacks Against Protocols"** — 1998
- **"The ROBOT Attack"** — Böck, Somorovsky, Young (2017)

---

*Material didático original. Falhas demonstradas apenas em chaves e servidores próprios, em
laboratório isolado. Nenhum material que ensine atacar criptografia de terceiro.*
