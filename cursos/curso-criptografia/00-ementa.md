---
title: "Criptografia Aplicada e Falhas: Onde o Algoritmo Esta Certo e o Sistema Quebra"
nivel: avancado
tags: [criptografia, aes, tls, kdf, nonce, padding-oracle]
---title: Criptografia Aplicada e Falhas: Onde o Algoritmo Esta Certo e o Sistema Quebra
nivel: intermediario
tags: [criptografia, aes, tls, kdf, nonce, padding-oracle]
---# Criptografia Aplicada e Falhas: Onde o Algoritmo Está Certo e o Sistema Quebra

**Ementa do curso · 28 horas · 10 módulos · PT-BR com termos técnicos em inglês**


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


*Material didático original. Falhas demonstradas apenas em chaves e servidores próprios, em
laboratório isolado. Nenhum material que ensine atacar criptografia de terceiro.*
