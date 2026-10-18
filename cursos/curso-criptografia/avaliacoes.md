# Avaliações — Gabaritos e Critérios

Gabaritos comentados dos dez módulos, mais rubricas dos labs e do projeto final.

---

## Módulo 1 — O que criptografia aplicada resolve

**1. Os quatro problemas**

Confidencialidade · integridade · autenticidade · **não repúdio**.

**2. Quatro que ela não resolve**

Autorização (controle de acesso) · disponibilidade (rede) · injeção (validação de entrada) ·
engenharia social (treinamento) · segredo no cliente (**não enviar**) · chave comprometida
(rotação).

**3. Confidencialidade sem integridade**

Porque o atacante **modifica o cyphertext** e o receptor decifra **lixo** sem saber. **Ou pior:**
com padding, cada alteração produz um erro distinguível — e é o **padding oracle**.

**4. As quatro construções**

Encrypt-and-MAC (MAC do plaintext) — **inseguro**. MAC-then-Encrypt — **padding oracle**.
**Encrypt-then-MAC** (MAC do cyphertext, verificado antes) — **correto**. **AEAD** — correto, e a
biblioteca faz por você.

**5. Por que MAC-then-Encrypt gera oracle**

Porque a **decifração** acontece antes da verificação do MAC. O padding inválido produz erro
**antes** de o MAC ser checado — e as duas falhas são distinguíveis.

**6. Por que AEAD**

Porque a construção é **feita pela biblioteca**, e certa. **Você não escolhe a ordem** — e a ordem
é o que importa.

**7. Primitiva por caso**

Senha: **argon2id**. Dado em repouso: **AEAD**. Autoria: **Ed25519**. Integridade com segredo:
**HMAC-SHA-256**.

**8. SHA-256 para senha**

Porque é **rápido demais** — uma GPU testa bilhões de SHA-256 por segundo. **Velocidade é a
propriedade que torna o hash inadequado para senha**, não a insegurança dele.

**9. `==` em segredo**

Porque **para no primeiro byte diferente** — e o tempo revela **quantos bytes estão certos**. Defesa:
`compare_digest`, que acumula o XOR de todos os bytes.

**10. ECB sem IV**

Porque **o mesmo bloco de plaintext produz o mesmo de cyphertext** — e o atacante aprende a
**estrutura** sem decifrar. Não é falha do AES; é ausência de variabilidade.

**11. Chave válida ≠ usuário**

Porque a chave prova **posse**, não **identidade**. Um token assinado com a chave do servidor prova
que veio do servidor — **não** que o `user_id` dentro dele é verdadeiro. **O conteúdo precisa ser
validado contra o banco.**

**12. `alg: none`**

Explora o servidor **lendo o algoritmo do token** e aceitando `none`. **Defesa:** fixar os
algoritmos no código, nunca ler do token.

**13. Cifrar senha é erro**

Porque a chave está no servidor — **quem tem o servidor tem a senha**. **Derivação** é one-way: quem
tem o servidor tem o hash, **e o hash não é a senha**.

**14. Forward secrecy**

Chave de sessão **efêmera**, descartada. O TLS 1.3 **sempre** usa ECDHE — por isso a chave privada
vazada amanhã **não** decifra o tráfego de hoje.

**15. Autorização**

Porque criptografia responde "o dado foi alterado" e "veio de quem tem a chave" — **não** "qual
usuário fez isso" nem "ele pode fazer isso". **São perguntas diferentes, e a segunda é de
aplicação.**

---

## Módulo 2 — Aleatoriedade

**1. Estatístico vs. imprevisível**

Estatístico: distribuição uniforme, passa nos testes. **Imprevisível:** E o próximo bit **não se
prevê** mesmo conhecendo os anteriores. **Todo imprevisível é estatístico; o inverso não vale.**

**2. Dígitos de π**

Porque passam em **qualquer** teste de uniformidade — e são **100% determinísticos**. **Qualquer um
reproduz a sequência.**

**3. Mersenne Twister como erro prático**

Porque está em `random` (Python), `Math.random` (JS), `rand()` (C) — **e é o que a maioria usa sem
pensar**. Com **624 saídas**, o estado é reconstruído e **o resto é previsível**.

**4. Fontes de entropia**

Timing de interrupção · teclado/mouse · disco e rede · variação de clock · RDRAND/virtio-rng ·
jitter.

**5. `/dev/urandom` se esgota?**

**Não.** Depois de iniciado, ele usa um **CSPRNG já semeado** — e o CSPRNG **estende**. Mais
entropia não melhora a saída. **O mito vem de `/dev/random`.**

**6. O que usar**

**`getrandom(2)`** — bloqueia só na primeira chamada, garantindo que o pool iniciou. Em script,
`/dev/urandom`. `/dev/random` praticamente nunca.

**7. `getrandom` bloqueia**

Para garantir que a chave **não seja gerada com pool vazio** — o caso do boot precoce em embarcado.

**8. Cinco fontes fracas**

`time()` como semente · `pid`+`time` · contador sem persistência · `rand()`/`Math.random` ·
entropia removida (Debian). Incidentes: roteador embarcado, PS3, WEP, Android 2013, Debian.

**9. `time()` como semente**

Porque o atacante **tem o relógio**. Ele testa a janela (±30 s = ~60 tentativas) e **reproduz** o
token. **Não é força bruta — é reprodução.**

**10. PS3**

O atacante **calculou** a chave privada a partir de **duas assinaturas** com o mesmo `r`. **Não
quebrou a curva** — usou a relação algébrica. `k = (z1−z2)/(s1−s2)`, depois `d = (s1·k − z1)/r`.

**11. GCM pior que CTR**

Porque no GCM o nonce entra **também na autenticação** — e o reuso torna **H recuperável**. Com H, o
atacante **forja a tag de qualquer mensagem**. **É pior que não ter MAC.**

**12. Três formas de nonce único**

Aleatório de 96 bits (probabilístico, seguro para < 2^32 mensagens) · contador persistente com
escrita atômica · híbrido.

**13. RFC 6979**

Nonce **determinístico derivado do hash e da chave** — sem aleatoriedade, sem reuso possível.
**Imune ao bug do PS3.**

**14. "Não achou nada"**

Porque o detector acha **autocorrelação e repetição de bloco** — os sinais grosseiros. **Ele não
acha semente de `time()` com boa distribuição.**

**15. A verificação que vale**

**Ler o código que gera.** `grep` pelos padrões fracos, e confirmação de que o caminho usa
`secrets`/`getrandom`.

**16. VM clonada**

Porque duas VMs do mesmo template, sem RDRAND, geram **a mesma chave inicial**. **É o caso do
roteador embarcado**, e é por isso que SSH avisa sobre chave de host duplicada.

**17. Armadilha do contador**

Se o estado resetar (reboot, container recriado, `tmpfs`), **o contador volta a zero e o nonce
repete.** Exige persistência e **escrita atômica** (`os.replace`).

**18. `compare_digest`**

Porque `==` **para no primeiro byte diferente** e vaza por tempo. `compare_digest` **acumula todos**
— o tempo é constante.

---

## Módulo 3 — Cifra simétrica e modo

**1. AES é permutação de bloco**

Ele pega **16 bytes** e devolve **16 bytes**, com a chave. **Transformar isso em "cifrar uma
mensagem" é o trabalho do modo.**

**2. Por que determinístico é correto**

Porque uma permutação **deve** ser determinística — mesma entrada, mesma saída. **Quem introduz a
variabilidade entre blocos é o modo** (IV, nonce, encadeamento).

**3. Falha de ECB**

**Mesmo bloco → mesmo cyphertext.** Vaza estrutura, e permite **reordenar blocos** sem decifrar.

**4. CBC corrompe**

**Um bit alterado em C_i corrompe P_i inteiro E um bit de P_(i+1)** — porque o encadeamento usa
C_i como entrada do próximo XOR.

**5. CTR com nonce reusado**

Porque o keystream é **o mesmo**: `C1 = P1 ⊕ KS` e `C2 = P2 ⊕ KS`. Logo
**`C1 ⊕ C2 = P1 ⊕ P2`** — e o KS cancela. **Não precisa da chave.**

**6. GCM com nonce repetido**

Porque **H (a chave de autenticação do GHASH) é recuperável** — e com ela o atacante **forja
mensagens válidas**. Não é só confidencialidade: **o MAC passa a ser calculável**.

**7. ChaCha20-Poly1305**

Porque é **rápido sem aceleração de hardware** (mobile, embarcado onde não há AES-NI), e tem as
mesmas garantias AEAD.

**8. IV vs. nonce**

**IV precisa ser IMPREVISÍVEL** (CBC — IV previsível permite controlar a entrada do AES).
**Nonce precisa ser ÚNICO** (CTR/GCM — pode ser previsível, como um contador).

**9. IV em claro**

Porque o IV **não é segredo** — é **variabilidade**. Ele acompanha o cyphertext, e em CBC **não se
cifra o IV**.

**10. Contador: CTR vs. CBC**

**Em CTR é correto** — o requisito é **unicidade**, e o contador dá isso. **Em CBC é errado** —
porque o requisito é **imprevisibilidade**, e o contador é previsível.

**11. PKCS#7 para 16 bytes exatos**

Adiciona **um bloco inteiro de `0x10`** (16 bytes). **Sempre adiciona**, para que a decifração
saiba onde está o padding.

**12. O que cria o oracle**

**A combinação** — padding **mais** resposta distinguível. **Remova qualquer um dos dois e o oracle
morre.**

**13. Três defesas**

**AEAD** — não há padding, superfície eliminada. **Encrypt-then-MAC + verificar antes** — sem
decifrar, sem padding para distinguir. **Erro uniforme** — mesma resposta (paliativo: timing vaza).

**14. Identificar o modo**

Distingue **duas coisas**: bloco repetido → **ECB** (ou CTR/GCM com nonce reusado); tamanho não
múltiplo → **stream**. **O resto é indistinguível.**

**15. A verificação que vale**

`grep -rn 'MODE_'` no código, e `grep` em como o nonce é gerado. **A análise de cyphertext é
indício, não prova.**

**16. AAD**

Dado **autenticado mas não cifrado**. Exemplo: `user:1000` — o servidor autentica **a quem pertence**
a mensagem sem cifrar esse campo. **Alterar o AAD quebra a tag.**

**17. O que o AEAD faz**

Escolhe a ordem correta, gera o nonce se você pedir, e **verifica antes de devolver**. **Você não
monta a construção.**

**18. Caso legítimo de CBC**

**Interoperação** com sistema que só fala CBC — e aí **Encrypt-then-MAC obrigatório**, com erro
uniforme. **Nunca** CBC puro em código novo.

---

## Módulo 4 — Chave

**1. Por que a chave é tudo**

Porque o algoritmo é **público e conhecido**. Kerckhoffs: **a segurança está na chave**. Logo, toda
falha de segurança é falha de **gerenciamento de chave**.

**2. Quatro tipos e reuso**

Cifra · MAC · assinatura · derivada de senha. **Reusar cifra como MAC** cria relação explorável
entre os usos (o caso extremo é o GCM).

**3. HKDF e rótulo**

HKDF **estende e separa**. O rótulo (`info`) faz parte da derivação — **um byte diferente no rótulo
produz uma chave completamente diferente.**

**4. KDF de senha vs. de chave**

Senha: **pouca entropia** → precisa ser **lento** para dificultar força bruta. Chave: **muita
entropia** → **rápido** para estender e separar. **Objetivos opostos.**

**5. Parâmetros do argon2id**

Memória **64 MB** (o mais importante) · iterações **3** · paralelismo 1–4 · salt 16 bytes.

**6. Argon2 vence a GPU**

Porque **exige memória**. Uma GPU com 24 GB roda ~375 tentativas paralelas a 64 MB — **não 10.000**.
**A memória impede a paralelização**, e é isso que o PBKDF2 não faz.

**7. PBKDF2**

Último recurso — é **paralelizável em GPU**. Exige **600.000 iterações** (SHA-256) para aproximar o
que o argon2 faz com 64 MB.

**8. ECDH**

Alice calcula `a·B = a·(b·G)`; Bob calcula `b·A = b·(a·G)`. **O mesmo ponto** — sem transmitir a
chave. Um observador vê A e B, e resolver `a·b·G` é o **logaritmo discreto**.

**9. O que ECDH não resolve**

**Autenticação.** Um MITM troca as públicas e calcula **duas chaves** — uma com Alice, uma com Bob.
**Ele decifra e reenvia**, e nenhum dos dois percebe.

**10. TLS 1.3**

Combina **ECDHE** (forward secrecy) com **assinatura** da chave efêmera pela chave do certificado
(`CertificateVerify`). **O MITM não consegue assinar.**

**11. X25519**

Mais rápida, **imune a ataque de parâmetro inválido**, e **sem os problemas de curva NIST**.
Constante de tempo por construção.

**12. RSA e 1 MB**

Porque RSA cifra **no máximo ~190 bytes** com chave de 2048 bits (o tamanho do módulo menos o
padding). **Acima disso, não cabe.**

**13. Envelope em quatro passos**

Gera DEK aleatória · cifra o dado com AEAD+DEK · cifra a DEK com a pública · guarda
`DEK_cifrada | nonce | tag | ct`.

**14. Envelope e rotação**

Sem envelope: **recifrar 1 GB** (segundos, e leitura do dado). Com envelope: **recifrar 32 bytes por
arquivo** (milissegundos). **A diferença é entre viável e impossível** — especialmente em
armazenamento frio.

**15. Compartilhar com cinco**

**Uma DEK**, uma cifra do dado, e **cinco `DEK_cifrada`** — uma por pessoa. O dado **não** é
recifrado cinco vezes.

**16. Cinco erros**

Chave no código · chave no cliente · chave única · sem rotação · sem controle de acesso.

**17. Chave no cliente**

Porque **o cliente tem a chave** — não importa ofuscação, minificação ou empacotamento. **Ele
extrai.** É **ofuscação**, não segurança.

**18. Falta de campo de versão**

Porque sem ele **dados antigos e novos são indistinguíveis** — e rotacionar exigiria recifrar tudo,
**que na prática não acontece**. **Rotação impossível = chave permanente.**

**19. Crypto-shredding**

Destruir **a chave**, e não o dado. Apagar o arquivo **não** destrói a chave em **backup, snapshot
ou réplica** — mas destruir a chave torna o dado **irrecuperável em todas as cópias**.

**20. Suspeita vs. calendário**

Calendário é **prevenção** (rotação periódica). Suspeita é **resposta a incidente** — e exige
rotação em **horas**, não no próximo ciclo anual. **São requisitos separados.**

---

## Módulo 5 — Hash, MAC e assinatura

**1. Três famílias**

**Hash:** sem chave, prova integridade contra acidente. **MAC:** com chave simétrica, prova
integridade **e posse de chave**. **Assinatura:** com chave assimétrica, prova **autoria e não
repúdio**.

**2. Hash sozinho**

Prova **que o conteúdo é o que é** — contra corrupção. **Não** prova quem escreveu, nem protege
contra adversário (que **recalcula** o hash). `sha256sum` é correto porque **não promete
autenticidade** — ele é **endereço de conteúdo**.

**3. MAC vs. assinatura**

**Uma diferença: não repúdio.** No MAC, **as duas partes podiam ter gerado a tag**. Na assinatura,
**só o dono da privada**.

**4. Preimagem, segunda preimagem, colisão**

**Preimagem:** dado o hash, achar qualquer entrada. **Segunda preimagem:** dada uma entrada, achar
outra com o mesmo hash. **Colisão:** achar **duas quaisquer**.

**5. MD5 e SHA-1 mortos**

**Colisão.** SHAttered (2017) produziu **dois PDFs diferentes com o mesmo SHA-1** — ~110 anos de GPU
então, **~$45.000 em nuvem dois anos depois**. MD5 colide em **segundos**.

**6. Colisão quebra assinatura**

Porque você **assina o hash**, não o documento. Com uma colisão, o alvo assina o **inofensivo** — e
a assinatura vale para o **malicioso**, porque **o hash é o mesmo**.

**7. SHA-3**

Porque tem **estrutura diferente** (sponge), **não herda falha do SHA-2**, e serve como **plano B**
se o SHA-2 for atacado. Também dá XOF (SHAKE).

**8. XOF**

*Extendable Output Function*: saída de tamanho arbitrário, com **prefixo consistente** —
`shake_128(x,16)` é prefixo de `shake_128(x,64)`. Permite derivar múltiplas chaves de uma vez.

**9. Extensão de comprimento**

SHA-2 usa **Merkle-Damgård** — o digest **é** o estado interno final. Quem tem o digest e **sabe o
tamanho de k** pode **continuar** a computação. **Precisa:** a tag, e o comprimento de k.

**10. `SHA256(k‖msg)` vs. HMAC**

Porque o digest do primeiro **é o estado**, permitindo continuar. HMAC usa **dois paddings**
(`k⊕ipad`, `k⊕opad`) — **o atacante não os conhece**, então não consegue continuar.

**11. `SHA256(msg‖k)`**

Melhor (não sofre extensão), **mas frágil** — é suscetível a colisão de digest interno em
construções Merkle-Damgård. **Use HMAC.**

**12. Três MAC corretos**

`HMAC-SHA-256` · `KMAC` (SHA-3) · modo MAC do BLAKE3.

**13. Ed25519 e o PS3**

Porque é **determinístico** — o nonce é derivado do hash e da chave (RFC 6979-like). **Não há nonce
para reusar.** O bug do PS3 é **estruturalmente impossível**.

**14. RSA PKCS#1 v1.5**

Porque tem **padding oracle** — é o esquema que o **ROBOT** quebrou. **Use PSS ou Ed25519.**

**15. `==` vaza**

Compara byte a byte e **para no primeiro diferente**. O tempo revela **quantos bytes estão certos**
— e o atacante extrai um byte de cada vez.

**16. Tentativas**

Sem oráculo: **2^256**. Com oráculo: **32 × 256 = 8.192**. Redução de **~10^74×**.

**17. Cinco linguagens**

Python `hmac.compare_digest` · C `CRYPTO_memcmp` · Go `hmac.Equal` · Java
`MessageDigest.isEqual` · Node `crypto.timingSafeEqual`.

**18. MAC contextual**

Impede que um MAC gerado para **um uso** valha para **outro**, com o mesmo dado. Exemplo: token de
**redefinição de senha** com o mesmo MAC de um de **sessão** — e o atacante usa um no lugar do
outro. **É o mesmo princípio do AAD e do HKDF com rótulo.**

**19. `grep`**

`grep -rEn 'hashlib\.sha(256|1|512)\s*\(\s*[a-z_]*(key|secret)' <código>` — e o equivalente em
outras linguagens.

**20. Hash sem chave autentica?**

**Nada.** `sha256sum` identifica conteúdo, **não autentica** — o adversário recalcula. **Se você
precisa de autenticidade sem segredo, use assinatura.**

---

## Módulo 6 — TLS

**1. Handshake do TLS 1.3**

`ClientHello` (versões, cifras, `key_share`) → `ServerHello` (escolha, `key_share`) → cifrado:
`EncryptedExtensions`, `Certificate`, **`CertificateVerify`**, `Finished` → `Finished` do cliente.

**2. Forward secrecy sempre**

Porque as chaves são **efêmeras** (`key_share`) — geradas por sessão e descartadas. **Não há
transporte de chave** com RSA.

**3. `CertificateVerify`**

O servidor **assina o transcript** do handshake com a chave do certificado. **É o que autentica** —
o MITM do módulo 4 não consegue assinar.

**4. Cinco diferenças do 1.3**

1 round-trip (vs. 2) · forward secrecy sempre · **só AEAD** · renegociação removida · compressão
removida · RSA key transport removido · 5 cifras boas.

**5. Compressão removida**

Porque comprimir **antes** de cifrar **vaza por tamanho** — é o **CRIME**.

**6. 0-RTT**

Permite dado na primeira mensagem, antes do handshake — **suscetível a replay**. **Use só para dado
idempotente** (GET, nunca POST de pagamento).

**7. SAN vs. CN**

**SAN** é a lista de nomes válidos; **CN** é o nome do sujeito. Desde 2017 **todo navegador exige
SAN** — `CN` certo sem SAN é **rejeitado**.

**8. `CA:TRUE` num leaf**

Permite que o certificado **assine outros** — e quem tem a chave dele **emite certificado válido
para qualquer domínio**. A verificação correta **rejeita**.

**9. `Authority Key Identifier`**

Aponta para o `SKI` do emissor — **ajuda a montar a cadeia**. Sem ele, a montagem é por tentativa.

**10. Cadeia vs. validade**

**Não.** São verificações **separadas**: `openssl verify` para a cadeia, `-attime` (ou checar as
datas) para a validade. **Cliente mal implementado checa uma e não a outra.**

**11. Raiz não vai**

Porque ela **já está no trust store** do cliente. Enviá-la é desperdício — e em alguns casos
**atrapalha**.

**12. Arquivo de cadeia**

**Leaf primeiro**, depois as **intermediárias**. **A raiz não vai.** Um ou mais certificados,
dependendo da hierarquia.

**13. O cadeado não garante**

Site honesto · conteúdo seguro · servidor bem configurado · cliente que valida · revogação checada
· ausência de MITM corporativo · protocolo forte · cifra forte · chave bem guardada · domínio
correto.

**14. MITM corporativo**

Porque ele instala **uma CA raiz** no dispositivo e **re-assina** os certificados. **O cadeado
continua aparecendo** — e o tráfego é decifrado.

**15. Flag por linguagem**

`verify=False` (requests) · `CERT_NONE` (urllib3) · `InsecureSkipVerify` (Go) ·
`rejectUnauthorized: false` (Node) · `TrustManager` que aceita tudo (Java) · `-k` (curl).

**16. Cifra anônima**

Porque significa **sem certificado** — **não há autenticação nenhuma**. O canal é cifrado e
**qualquer um pode estar no meio**. **Pior que HTTP**, porque **parece** seguro.

**17. HSTS**

Impede que o atacante **reescreva `http://`** e o usuário nunca chegue ao HTTPS. **O redirect do
servidor não protege** — porque o atacante **não o envia**. **HSTS põe a decisão no navegador.**

**18. Tickets de sessão**

Porque **tickets longos** permitem decifrar sessões antigas com a chave do ticket — **enfraquecendo
o forward secrecy**.

**19. Revogação**

Porque **CRL é grande e OCSP é lento** — e clientes frequentemente não checam. **Validado curta**
(CT, Let's Encrypt com 90 dias) **resolveu** o problema que a revogação não resolveu.

**20. Correção de uma linha**

`verify=False` → **remover a linha**. É o achado de maior relação impacto/esforço em TLS.

---

## Módulo 7 — As cinco classes

**1. As cinco classes**

**Oracle** (resposta distinguível) · **nonce/IV reusado** (esquema determinístico) · **entropia
fraca** (semente previsível) · **validação ausente** (o código não verifica) · **protocolo**
(negociação permissiva).

**2. Nenhuma ferramenta pega**

**Classes 1 e 2.** Não há erro, não há log, não há crash — há uma **diferença de nanossegundos** ou
um **reuso silencioso**. **Exigem leitura.**

**3. Classe 5 sem padrão local**

Porque **o código de cada lado está correto** — a falha está na **interação**. **Substituída por
varredura de configuração.**

**4. Oráculo de tempo**

Comparação que **para no primeiro byte diferente**. O tempo revela quantos bytes estão certos, e o
atacante extrai **um byte por vez**.

**5. Tentativas**

**2^256 → 8.192.** Redução de ~10^74×.

**6. Mensagem de erro específica**

Porque **distingue estados internos**. Exemplos: `"padding inválido"` vs. `"MAC inválido"`;
`"usuário não encontrado"` vs. `"senha incorreta"`.

**7. Enumeração de usuário**

Porque a resposta **distingue existente de inexistente** — o atacante **mapeia a base**. **Correção:**
uma mensagem só, e **o mesmo caminho de código** nos dois casos (para igualar o tempo).

**8. `404` genérico**

Porque **qualquer coisa** devolve 404 — proxy, serviço fora do ar, recurso diferente. **Prova é a
assinatura específica do serviço.** É o mesmo princípio do oráculo: **sem especificidade, não há
informação.**

**9. Nonce de 32 bits**

**Não.** Colide com **~77.000 mensagens** (paradoxo do aniversário). Um servidor que cifra 1.000/s
chega lá **em 77 segundos**.

**10. Pior esquema**

**AES-GCM** — porque o reuso **não só** vaza o XOR, mas torna **H recuperável** — e com H o atacante
**forja mensagens**. **Os quatro plaintexts e o MAC ficam comprometidos.**

**11. Escrita atômica**

Porque se o processo **morre entre ler e gravar**, o contador retrocede — e o nonce **repete**.
Escrita em arquivo temporário + `os.replace` (atômico em POSIX).

**12. Cinco padrões de entropia**

`random`/`Math.random`/`mt_rand`/`new Random`/`$RANDOM` → `secrets`/`crypto.randomBytes`/`random_bytes`
/`SecureRandom`/`/dev/urandom`.

**13. `$RANDOM`**

**15 bits.** Semente de `time` internamente. **Trivial de prever.**

**14. `sha256(k+msg)`**

**Extensão de comprimento** — o digest é o estado, e o atacante pode continuar. **Gravidade alta, e
correção de uma linha** (`hmac.new`).

**15. RS256→HS256**

Porque o servidor **espera RS256** e usa a **pública** para verificar. O atacante muda o `alg` para
HS256 e **assina com a pública**, que ele **conhece**. O servidor usa a pública como chave HMAC — e
**valida**.

**16. Correção de uma linha**

`jwt.decode(..., algorithms=['RS256'])` — **fixando o algoritmo**.

**17. `verify=False`**

Porque **desliga a validação do certificado** — e permite MITM. **É um achado crítico**, e a
correção é **remover a linha**.

**18. DROWN**

Porque o servidor tinha **TLS 1.2 correto** e **aceitava SSLv2 na mesma chave**. E o SSLv2 tinha
falha que permitia **decifrar o TLS 1.2**. **O protocolo velho derrubou o novo.**

**19. Classe 5 exige varredura**

Porque o código pode ter **uma flag a mais** que ninguém lembra. **Você precisa testar o que o
servidor aceita**, não ler o que ele declara.

**20. Lição da classe 5**

**O elo mais fraco define a segurança do conjunto.** Não adianta o TLS 1.3 estar correto se o
servidor ainda aceita SSLv3.

---

## Módulo 8 — Ataque em laboratório

**1. Padding oracle em cinco passos**

(1) O atacante tem o cyphertext. (2) Ele altera `C_(i-1)`. (3) Isso altera `P_i`. (4) Ele testa
valores até o padding ficar válido — e a resposta **distingue**. (5) Com o padding válido, ele
calcula `D(C_i)` e daí o plaintext.

**2. Não precisa da chave**

Porque `P_i = D(C_i) ⊕ C_(i-1)`, e ele **controla `C_(i-1)`**. Ele não precisa conhecer `D(C_i)` —
só **observar** se o resultado é padding válido.

**3. Consultas por byte**

**~256** (média ~128). Porque ele testa **todos os valores possíveis do byte** para encontrar o que
produz o padding alvo.

**4. Bloco 0 inacessível**

Porque o **IV não é controlável** — ele não tem `C_(-1)`. **No cenário real, o atacante tem que
obter um cyphertext cujo bloco 0 não lhe interessa**, ou usar o padrão de cookie onde o IV acompanha
o dado.

**5. Onde obtém o cyphertext**

**O cyphertext não é segredo.** Ele trafega, fica em cookie, em URL, em backup, em log. **Cifra sem
autenticação não protege contra atacante ativo.**

**6. `C1 ⊕ C2 = P1 ⊕ P2`**

Porque `C1 = P1 ⊕ KS` e `C2 = P2 ⊕ KS`. O XOR **cancela** o keystream: `(P1⊕KS) ⊕ (P2⊕KS) =
P1 ⊕ P2`.

**7. `H` no GCM**

É a **chave do GHASH** — o polinômio de autenticação. Recuperá-la permite **forjar a tag de qualquer
mensagem** — e é **pior que não ter MAC**, porque o MAC passa a ser **calculável pelo atacante**.

**8. Quantas mensagens**

**Duas.** Só isso. `T1 ⊕ T2 = (C1 ⊕ C2)·H` dá **uma equação em H**.

**9. GCM pior que sem MAC**

Porque sem MAC, o atacante só altera o cyphertext e o receptor **rejeita** (ou aceita lixo). Com GCM
e nonce reusado, o atacante **calcula a tag correta** — e o receptor **aceita a mensagem forjada**.

**10. Timing em quatro passos**

(1) A comparação para no primeiro diferente. (2) O tempo é proporcional aos bytes certos. (3) Para
cada byte, testa 256 valores e escolhe o que **tarda mais**. (4) Repete por byte.

**11. Sinal de ruído**

**Mediana** de muitas execuções (resiste a outliers) · **repetição** (confirma o padrão) ·
**comparação com a segunda melhor** (a diferença é o sinal). **Mediana de 800 execuções** é o
padrão do curso.

**12. Redução**

**2^256 → 8.192.** Redução de **~10^74×**.

**13. Redirect não protege**

Porque o atacante na rede **simplesmente não envia o redirect** — ele intercepta o HTTP e mantém o
usuário em HTTP puro, fazendo TLS com o servidor real. **O usuário nunca vê o cadeado.**

**14. HSTS**

**Põe a decisão no navegador.** Com HSTS, o navegador **recusa HTTP** e vai direto ao HTTPS —
**mesmo antes de fazer a primeira requisição**. **O atacante não consegue rebaixar.**

**15. Preload quase irreversível**

Porque a lista **está embutida nos navegadores**, e removê-la leva **meses** — além de exigir que
todos os subdomínios suportem HTTPS. **É compromisso de longo prazo.**

**16. Três defesas**

**AEAD** — elimina a superfície (não há padding). **Encrypt-then-MAC + verificar antes** — sem
decifrar, sem padding para distinguir. **Erro uniforme** — fecha o canal de erro (timing ainda vaza).

**17. Verificar antes de decifrar**

Porque **o `decrypt` nunca roda com padding inválido** — o MAC já recusou. **A superfície do padding
nunca é tocada**, e não há erro para distinguir.

**18. Correções de uma linha**

**`compare_digest`** · **`secrets.token_bytes(12)`** · **`verify=False` removido** —
e mais quatro (o módulo 9 lista sete de dez).

**19. Nenhum usou a chave**

Prova que **o algoritmo estava correto** nos quatro casos (AES-CBC, AES-GCM, comparação de bytes,
TLS 1.2) — e que **a falha estava em volta dele**. **É a tese do curso.**

**20. Lição comum**

**O algoritmo está certo. A falha está no modo, na aleatoriedade, na validação e no protocolo.**

---

## Módulo 9 — Correção

**1. Construções**

Cifrar dado com integridade: **AEAD**. Guardar senha: **argon2id**. Derivar chave: **HKDF**.
Comparar segredo: **`compare_digest`**.

**2. Por que não escrever**

Primitiva: **duas décadas de análise** vs. uma tarde. Modo: **é onde a composição acontece**, e a
composição **é** a correção. Protocolo: **cada versão corrigiu um ataque da anterior**.

**3. O que você escreve**

**A escolha da construção, o formato do dado (com versão), e a política** — rotação, retenção,
classificação.

**4. Política mais importante**

Porque **a criptografia pode estar perfeita e o sistema inseguro**: chave que nunca rotaciona,
segredo no repositório, log que vaza, retenção indefinida. **É a política que dá segurança de
verdade.**

**5. Noise**

Um **framework** para montar protocolo a partir de peças **prontas e analisadas** — é a resposta
quando você precisa de protocolo próprio, sem inventar.

**6. Três razões**

Análise acumulada · a ordem e o que o MAC cobre **é** a correção · a biblioteca já fez e fez certo.

**7. Cifrar com integridade**

**AEAD** — GCM ou ChaCha20-Poly1305.

**8. `FalhaAutenticacao` única**

Porque **não há distinção para o atacante observar**. Verificar **antes** de decifrar, e levantar
**sempre a mesma exceção**, elimina o canal de erro.

**9. Como provar**

**Capturar as mensagens de exceção** de falhas diferentes e comparar. Se forem **idênticas**, não há
oracle. **É a verificação, não a intenção.**

**10. `compare_digest`**

Porque **acumula o XOR de todos os bytes** — o tempo é constante independente de quantos estão
certos. **Elimina o canal completamente.**

**11. Contador determinístico**

Requisito: **estado persistente com escrita atômica** (`os.replace`). Se o estado resetar, o nonce
**repete**.

**12. Escrita atômica**

Porque entre ler e gravar, o processo pode **morrer** — e o contador retrocede. `os.replace` é
atômico em POSIX.

**13. Campo de versão**

Permite que o sistema **identifique qual chave cifrou** cada dado — e portanto **rotacionar sem
recifrar**, mantendo a chave antiga só para leitura.

**14. Migrar dado já cifrado**

**Decifra com a antiga, recifra com a nova** — e o campo de versão permite identificar qual usar. A
migração pode ser **incremental**, à medida que o dado é acessado.

**15. Três correções de "remover a linha"**

`verify=False` · `alg` do token (fixar) · `InsecureSkipVerify`.

**16. `algorithms=[...]`**

Porque **sem ela a biblioteca lê o algoritmo do token** — e aceita `none` ou confunde RS com HS.
**A versão moderna do PyJWT exige** o parâmetro.

**17. Paliativo vs. definitivo**

**Erro uniforme** é paliativo (timing ainda vaza). **AEAD** é definitivo (elimina a superfície).

**18. Formato do cyphertext**

**Não** é inventar criptografia. **É seu, e precisa de versão** — é o que torna rotação possível.

**19. HSTS**

Porque é **decisão de política** (compromisso de longo prazo, afeta subdomínios), não de
implementação. **O código só emite o cabeçalho.**

**20. Ordem**

**Remover a linha** → **trocar a função** → **trocar a construção** → **mudar o formato** (exige
migração) → **mudar a política**. Por **esforço crescente** e **impacto decrescente de risco de
quebra**.

---

## Módulo 10 — Projeto

**1. Dez famílias**

Cifra simétrica · assimétrica · hash · MAC · KDF · assinatura · aleatoriedade · TLS · token · chave.

**2. Ausência como achado**

Nenhum `compare_digest` + algum MAC → **presunção de comparação insegura**. Nenhum `secrets` +
algum token → **presunção de RNG fraco**. Nenhum `key_version` → **rotação impossível**.

**3. Cinco classes e detecção**

Oracle (leitura) · nonce (leitura) · entropia (`grep`) · validação (`grep`) · protocolo (**varredura**).

**4. Nenhum `grep`**

**Classes 1 e 2.** Exigem leitura — e às vezes medição.

**5. Classe 5**

Porque **o código de cada lado está correto**. Substituída por **teste de configuração**: protocolos
aceitos, cifras, HSTS, 0-RTT.

**6. "O que o atacante obtém"**

Separa **achado grave de irrelevante**. Um `==` em comparação de **log** não dá nada; o mesmo em
comparação de **MAC** dá o segredo. **Sem essa seção, a severidade é palpite.**

**7. "Exige migração"**

Porque uma correção que **muda o formato** não pode ser aplicada sem plano — e frequentemente é
**adiada**. Declarar isso é parte da prioridade.

**8. Provar ausência de oracle**

**Capturar as mensagens de exceção** de falhas diferentes e comparar. **Idênticas = sem oracle.**

**9. Provar tempo constante**

**Medir** o tempo para diferentes números de bytes certos e verificar que a **variação é pequena**
(< 25%). Plano = constante.

**10. Provar nonce único**

**Cifrar o mesmo dado duas vezes** e calcular o **XOR dos cyphertexts**. Com nonce repetido, o XOR
**seria zeros** (mesmo plaintext). Não sendo, o nonce é diferente.

**11. Provar**

**Medir e comparar** — não declarar. Uma correção não provada é uma correção **presumida**, e a
presunção é o erro que o módulo 10 do curso de Linux chama de "intenção".

**12. "O que está correto"**

Porque um relatório **só de falhas esconde o que não foi olhado**. Listar o correto é **informação**,
não enchimento.

**13. Achado irrelevante vs. grave**

**Irrelevante:** `==` comparando um identificador público. **Grave:** o **mesmo** `==` comparando um
MAC. **O padrão é idêntico; o que muda é o que o atacante obtém.**

**14. Ordem por esforço × impacto**

Porque o cliente **executa** — e a ordem define **o que ele corrige primeiro**. Sem ela, ele
começa pelo mais difícil e **desiste**.

**15. Repositório vs. instância**

**Repositório público:** leitura de código, relatório privado ou divulgação responsável.
**Instância pública:** **execução contra serviço de terceiro** — que é ataque.

**16. Falha global**

Porque um padding oracle contra serviço real **vaza dado de terceiros** — diferente de má
configuração, cujo dano é **local**. **A escala do impacto é outra.**

**17–20. Pessoais**

Dependem do alvo escolhido e do que você achou.

---

## Critérios de correção dos labs

| Critério | Peso | O que se avalia |
|---|---|---|
| Código roda | 25% | Com saída **real** |
| Demonstração | 30% | A falha **apareceu** |
| Medição | 20% | Números reais (tempo, consultas, bits) |
| Interpretação | 25% | Você sabe o que o resultado significa |

**Penalidades automáticas:**

- Saída de exemplo em vez da real: −25%.
- Ataque **contra host que não seja `127.0.0.1`**: **lab zerado**.
- Chave de terceiro envolvida: **lab zerado**.
- Falha declarada sem demonstração: −20%.
- Correção sem verificação: −10%.

---

## Projeto final — rubrica

| Dimensão | Insuficiente | Adequado | Exemplar |
|---|---|---|---|
| Inventário | 3 famílias | 7 famílias | **10**, com a ausência anotada |
| Classes | 1 classe | 3 classes | **5**, com método por classe |
| Achado | Padrão apontado | Com evidência | **+ "o que o atacante obtém" + custo** |
| Correção | Genérica | Com comando | **+ prova medida** |
| Migração | Não menciona | Menciona | **Marca quais exigem e por quê** |
| Correto | Ausente | Lista curta | **Lista o que verificou e está bom** |
| Limitações | Ausente | Lista o óbvio | **3+ com motivo** |
| Ordem | Ausente | Por severidade | **Por esforço × impacto** |
| Conduta | Ausente | Menciona | **Declaração preenchida** |

**Os dois itens de maior valor:**

1. **"O que o atacante obtém"** — separa achado grave de irrelevante, e **substitui o palpite de
   severidade por fato**.
2. **A prova medida da correção** — porque declarar que corrigiu é **intenção**, e medir é
   **verificação**.

---

*Material didático original. Falhas demonstradas apenas em chaves e servidores próprios, em
laboratório isolado. Nenhum material que ensine atacar criptografia de terceiro.*
