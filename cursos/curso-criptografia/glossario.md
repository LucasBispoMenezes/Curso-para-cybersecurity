# Glossário

Termos em português com o equivalente técnico em inglês, na ordem em que aparecem no curso.

---

## A

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **AAD** | Additional Authenticated Data | M3 | Dado **autenticado mas não cifrado**. Amarra contexto ao cyphertext. |
| **AEAD** | Authenticated Encryption with Associated Data | M1 | Confidencialidade + integridade numa construção. GCM, ChaCha20-Poly1305. |
| **argon2id** | Argon2id | M4 | KDF de senha. **Exige memória** — é o que impede a GPU. A escolha em 2026. |
| **ASLR** | Address Space Layout Randomization | M2 | Endereço aleatório. É aleatoriedade aplicada — e o alvo do exploit. |
| **Assinatura** | Digital signature | M5 | Prova autoria **e** não repúdio. Só o dono da privada assina. |

## B

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **bcrypt** | bcrypt | M4 | KDF de senha legado. Aceitável com `cost=12`. Estrutura de 72 bytes limita. |
| **Bleichenbacher** | Bleichenbacher attack | M5 | Padding oracle em RSA. Base do ROBOT. |
| **Bloco** | Block | M3 | Unidade do AES: **16 bytes**. A cifra só cifra 16. |
| **Boneh-Shoup** | Boneh-Shoup | — | Livro-texto livre de criptografia aplicada. |

## C

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **CBC** | Cipher Block Chaining | M3 | Modo que encadeia. **Sem MAC, é alterável** — padding oracle. |
| **Cifra** | Cipher | M1 | A primitiva. AES, ChaCha20, RSA. |
| **CSPRNG** | Cryptographically Secure PRNG | M2 | Fonte imprevisível. `secrets`, `os.urandom`, `getrandom`. |
| **Colisão** | Collision | M5 | Duas entradas com o mesmo hash. **Mata MD5 e SHA-1.** |
| **Comprimento (extensão)** | Length extension | M5 | Ataque em `hash(k‖msg)`. HMAC resiste. |
| **Confidencialidade** | Confidentiality | M1 | Alguém sem a chave não lê. **Não implica integridade.** |
| **CT (Certificate Transparency)** | CT log | M6 | Log público de certificado. **Torna a emissão auditável.** |

## D

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **DEK** | Data Encryption Key | M4 | Chave de dados, cifrada no envelope. |
| **Derivação** | Key derivation | M4 | De um segredo, N chaves. HKDF com rótulo. |
| **Determinístico** | Deterministic | M3 | Mesma entrada, mesma saída. **Correto no AES; errado no nonce.** |
| **Downgrade** | Downgrade attack | M6 | Forçar versão mais fraca. **HSTS é a defesa.** |
| **DROWN** | DROWN | M6 | SSLv2 derruba TLS 1.2 na mesma chave. Elo mais fraco define. |

## E

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **ECB** | Electronic Codebook | M3 | Modo **proibido**. Mesmo bloco → mesmo cyphertext. |
| **ECDH** | Elliptic Curve Diffie-Hellman | M4 | Acordo de chave. **Não autentica** — precisa de assinatura. |
| **ECDSA** | ECDSA | M5 | Assinatura por curva. ⚠ **Exige nonce único** — o bug do PS3. |
| **Ed25519** | Ed25519 | M5 | Assinatura **determinística**. Imune ao bug de nonce. A escolha. |
| **Envelope** | Key wrapping | M4 | Cifra o dado com DEK; cifra a DEK com a pública. **Torna rotação viável.** |
| **Entropia** | Entropy | M2 | Imprevisibilidade. Vem do mundo físico — o computador é determinístico. |

## F

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Falha** | Failure | M7 | As cinco classes: oracle, nonce, entropia, validação, protocolo. |
| **Forward secrecy** | Forward secrecy | M4 | Chave efêmera. **Vazamento futuro não decifra passado.** |

## G

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **GCM** | Galois/Counter Mode | M3 | AEAD. ⚠ **Nonce repetido recupera H** — pior que não ter MAC. |
| **GETRANDOM** | getrandom(2) | M2 | Syscall. Bloqueia só na primeira chamada, antes do pool iniciar. |

## H

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Hash** | Hash | M5 | Sem chave. **Identifica conteúdo; não autentica.** |
| **Heartbleed** | Heartbleed | M6 | Implementação. Leitura fora do buffer vazou chave. |
| **HKDF** | HKDF (RFC 5869) | M4 | KDF **rápido**. Estende e separa. **Não serve para senha.** |
| **HMAC** | HMAC | M5 | MAC correto. `hmac.new(k, msg)`. Nunca `hash(k+msg)`. |
| **HSTS** | HTTP Strict Transport Security | M6 | Navegador força HTTPS. **Impede downgrade por rede.** |

## I

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Integridade** | Integrity | M1 | O dado não mudou. **Sem ela, confidencialidade é insuficiente.** |
| **IV** | Initialization Vector | M3 | Valor inicial. **Precisa ser IMPREVISÍVEL** (CBC). Pode ser público. |

## J

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **JWT** | JSON Web Token | M7 | Token assinado. ⚠ **Fixe o `alg` no código.** |

## K

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **KDF** | Key Derivation Function | M4 | Deriva chave. **De senha: lento.** De chave: rápido. |
| **Keystream** | Keystream | M3 | Saída do modo stream (CTR). **Repetido = XOR dos plaintexts.** |

## M

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **MAC** | Message Authentication Code | M5 | Com chave simétrica. Prova integridade **e posse de chave**. |
| **MD5** | MD5 | M5 | ☠ **Morto.** Colisão em segundos. |
| **Merkle-Damgård** | Merkle-Damgård | M5 | Construção do SHA-2. **Base da extensão de comprimento.** |
| **Modo de operação** | Mode of operation | M3 | Como encadear blocos. **É o que quebra.** |

## N

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Não repúdio** | Non-repudiation | M5 | Só a assinatura dá. As duas partes podiam gerar o MAC. |
| **Nonce** | Nonce | M3 | *Number used once*. **Precisa ser ÚNICO** — pode ser previsível (CTR). |

## O

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Oracle** | Oracle | M7 | Resposta distinguível. **Classe 1** — padding, tempo, erro, enumeração. |

## P

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Padding** | Padding | M3 | PKCS#7. Preenche ao múltiplo do bloco. **A superfície do oracle.** |
| **PBKDF2** | PBKDF2 | M4 | KDF legado. ⚠ Paralelizável em GPU. 600.000 iterações se não houver argon2. |
| **Preimagem** | Preimage | M5 | Achar entrada dado o hash. Diferente de colisão. |
| **PS3** | PlayStation 3 | M2 | Nonce fixo no ECDSA. **Chave privada recuperada.** |

## R

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Revogação** | Revocation | M6 | CRL/OCSP. ⚠ **Frequentemente não checada** — validade curta resolveu. |
| **ROBOT** | Return Of Bleichenbacher's Oracle Threat | M5 | Padding oracle em RSA via TLS. |
| **Rotação** | Key rotation | M4 | Trocar chave. **Exige campo de versão no cyphertext.** |
| **RSA-OAEP** | RSA-OAEP | M4 | RSA com padding seguro. **Não use PKCS#1 v1.5.** |

## S

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **SAN** | Subject Alternative Name | M6 | Nomes válidos do certificado. **Substituiu o CN** desde 2017. |
| **scrypt** | scrypt | M4 | KDF de senha com memória. `N=2^15`. |
| **SHA-1** | SHA-1 | M5 | ☠ **Morto.** SHAttered (2017) produziu colisão. |
| **SHA-3** | SHA-3 (Keccak) | M5 | Estrutura sponge. **Não herda falha do SHA-2.** |
| **SHAKE** | SHAKE | M5 | XOF: saída de tamanho arbitrário, com prefixo consistente. |
| **Subchave** | Subkey | M4 | Derivada com rótulo. **Um segredo, N chaves independentes.** |

## T

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Tempo constante** | Constant time | M5 | Comparação que não para. `compare_digest`, `CRYPTO_memcmp`. |
| **Timing attack** | Timing attack | M7 | Tempo revela informação. **Reduz 2^256 para 8.192 tentativas.** |
| **TLS 1.3** | TLS 1.3 | M6 | 1 round-trip, forward secrecy sempre, só AEAD, sem compressão. |

## V

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **Verificação de cadeia** | Chain validation | M6 | Cada elo até a raiz confiada. **Separada da validade temporal.** |

## X

| Termo (PT) | Técnico (EN) | Onde | Definição |
|---|---|---|---|
| **X25519** | X25519 | M4 | Curva para ECDH. **Preferida a P-256** — sem problema de parâmetro. |
| **XOF** | Extendable Output Function | M5 | Saída de tamanho arbitrário. SHAKE. |

---

## As cinco classes de falha — consulta rápida

| # | Classe | Origem | Reconhece por | Ferramenta | Exemplo real |
|---|---|---|---|---|---|
| 1 | **Oracle** | Resposta distinguível | Erro diferente, tempo, enumeração | **nenhuma** | Padding oracle, ROBOT |
| 2 | **Nonce/IV** | Esquema determinístico | Constante, contador reiniciável, `time()` | **nenhuma** | WEP, PS3 |
| 3 | **Entropia** | Semente previsível | `rand()`, `time()`, `Math.random` | `grep` | Debian OpenSSL, Android |
| 4 | **Validação** | O código não verifica | `verify=False`, `alg` do token, `==` | `grep` | JWT `alg:none` |
| 5 | **Protocolo** | Negociação permissiva | Downgrade, versão antiga, compressão | **scanner** | DROWN, POODLE |

⚠ **As classes 1 e 2 não têm detecção automática.** É por isso que auditoria de criptografia não é
totalmente automatizável.

---

## Os quatro problemas que criptografia resolve — consulta rápida

| # | Problema | Primitiva |
|---|---|---|
| 1 | Confidencialidade | Cifra (AEAD) |
| 2 | Integridade | MAC, AEAD, assinatura |
| 3 | Autenticidade | MAC, assinatura |
| 4 | Não repúdio | **Assinatura** (só ela) |

⚠ **E o que ela NÃO resolve:** autorização, disponibilidade, injeção, engenharia social, segredo no
cliente, chave comprometida.

---

## Problema → construção — consulta rápida

| Você quer | Use | **Não use** |
|---|---|---|
| Cifrar dado, com integridade | **AEAD** (AESGCM, ChaCha20) | CBC sem MAC |
| Cifrar dado grande | **Envelope** | RSA direto |
| Guardar senha | **argon2id** (64MB, 3it) | SHA-256, MD5 |
| Derivar chave | **HKDF** | SHA-256 direto |
| Acordo de chave | **X25519** | DH sem autenticação |
| Assinar | **Ed25519** | RSA PKCS#1 v1.5 |
| MAC | **HMAC-SHA-256** | `sha256(k+msg)` |
| Comparar segredo | **`compare_digest`** | `==`, `memcmp` |
| Aleatoriedade | **`secrets`/`getrandom`** | `random`, `time` |
| Canal | **TLS 1.3** | escrever o seu |
| Token | **JWT com `alg` fixo** | ler `alg` do token |
| Identificar conteúdo | **SHA-256** | usar como autenticação |

---

## Os erros de chave — consulta rápida

| # | Erro | Consequência |
|---|---|---|
| 1 | Chave no código | Vaza no repositório e no binário |
| 2 | **Chave no cliente** | **O cliente tem a chave** — ofuscação, não segurança |
| 3 | Chave única para tudo | Um vazamento derruba tudo |
| 4 | Sem rotação | **Vaza em 2019, vale em 2026** |
| 5 | Sem controle de acesso | Qualquer processo lê |

⚠ **O erro 2 é o mais grave, e o mais comum em app.**

---

## As correções — consulta rápida

| Falha | Correção | Linhas |
|---|---|---|
| Erro distinguível | AEAD + erro uniforme | 1 |
| Comparação por tempo | `compare_digest` | **1** |
| Enumeração de usuário | resposta única | 1 |
| Nonce reusado | `secrets.token_bytes(12)` | **1** |
| Entropia fraca | `secrets`/`os.urandom` | **1** |
| MAC `hash(k+msg)` | `hmac.new` | 1 |
| `alg` do token | `algorithms=[...]` | **1** |
| Sem `exp` | `options={'require': [...]}` | 1 |
| `verify=False` | remover a linha | **1** |
| Downgrade | HSTS + TLS 1.2 mínimo | **1** |

⚠ **Sete das dez são uma linha.** O trabalho está em **achar**, não em corrigir.

---

## Onde a correção mora — consulta rápida

| Camada | Você escreve? | Por quê |
|---|---|---|
| Primitiva | **Não** | Biblioteca auditada |
| Modo | **Não** | É onde a composição acontece |
| Construção | **Escolhe** | Decisão de projeto |
| Formato do dado | **Sim** | Seu, **com versão** |
| **Política** | **Sim** | **É onde a maioria falha** |
| Protocolo | **Use existente** (TLS, Noise) | Análise de décadas |

---

## Os cinco pontos que o curso tenta deixar

| # | Ponto |
|---|---|
| 1 | **Ninguém quebra AES.** Quebram o modo, a chave, o RNG, o protocolo, a validação. |
| 2 | **A aleatoriedade é a causa nº 1** — operacional, não matemática. |
| 3 | **Sem integridade, confidencialidade não protege.** |
| 4 | **Toda a segurança mora na chave** — e a política é onde falha. |
| 5 | **A correção é curta. O trabalho está em achar.** |

---

*Material didático original. Falhas demonstradas apenas em chaves e servidores próprios, em
laboratório isolado. Nenhum material que ensine atacar criptografia de terceiro.*
