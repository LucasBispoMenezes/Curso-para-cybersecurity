# C para Pesquisa de Segurança

Curso de 32 horas, onze módulos. Do `hello world` ao parser que resiste a entrada hostil — e que
serve de alvo para o curso de fuzzing.

---

## A linha de progressão

⚠ **Leia esta tabela antes de começar.** Em cada linha, o que você sabe **no módulo 1** e o que
sabe **no módulo 11**.

| | Módulo 1 | Módulo 11 |
|---|---|---|
| **Escrever C** | função, `if`, `for`, `printf` | parser completo, com tratamento de erro |
| **Pensar memória** | "é uma variável" | desenho do layout, com endereço e offset |
| **Achar bug** | não sabe o que procurar | reconhece a classe por leitura, antes de rodar |
| **Ferramenta** | `gcc`, `printf` | `clang`, `ASan`, `UBSan`, `gdb`, `valgrind`, `make` |
| **Ler diagnóstico** | não existe | lê o relatório do sanitizer campo por campo |
| **Mentalidade** | "funcionou, então está certo" | "funcionou **neste** caso — e por quê" |

**Sem pré-requisito de C.** Sabe programar em qualquer linguagem? Entra no módulo 1.

---

## A tese

Cursos de C ensinam a **escrever** C. Este ensina a **entender por que o C quebra** — que é a
habilidade de quem pesquisa vulnerabilidade.

⚠ **"O programa funcionou" não é prova de nada em C.** O curso inteiro existe para isso: descobrir
por que funcionou, e o que aconteceria com outra entrada.

---

## A trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [C do zero, com olhar de memória](modulo-01.md) | 3 | Programa que compila e você explica cada byte |
| 2 | [Ponteiro, array e memória](modulo-02.md) | 4 | Layout desenhado à mão, com endereço |
| 3 | [Alocação e duração de vida](modulo-03.md) | 3 | Sabe onde cada dado vive e quando morre |
| 4 | [String, buffer e o limite ausente](modulo-04.md) | 3 | Sabe por que C quebra, e como evitar |
| 5 | [**Comportamento indefinido**](modulo-05.md) | 4 | Prevê quando `-O2` muda o comportamento |
| 6 | [**As sete classes de bug**](modulo-06.md) | 4 | Reconhece a classe por leitura de código |
| 7 | [Sanitizer, `gdb`, `valgrind`](modulo-07.md) | 3 | Instrumenta e lê o diagnóstico |
| 8 | [Struct, union, enum e layout](modulo-08.md) | 2 | Calcula padding e offset de memória |
| 9 | [Arquivo, binário e parsing](modulo-09.md) | 2 | Lê formato binário com validação |
| 10 | [C que resiste a entrada hostil](modulo-10.md) | 2 | Padrão de validação em todo limite |
| 11 | [Projeto: parser fuzzável](modulo-11.md) | 2 | **O alvo do curso de fuzzing** |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md) · [Código](codigo/README.md)

---

## Ambiente

```bash
sudo apt update
sudo apt install -y build-essential clang llvm gdb valgrind make binutils file xxd python3
mkdir -p ~/c-lab/{src,bin,tmp}
```

Verificação:

```bash
gcc --version | head -1
clang --version | head -1
valgrind --version
```

⚠ **Você vai usar `gcc` e `clang`.** Eles divergem em comportamento indefinido — e o módulo 5
explora exatamente isso.

---

## As flags do curso

| Uso | Flags | Quando |
|---|---|---|
| **Desenvolvimento** | `-g -O0 -Wall -Wextra` | Módulos 1–4 |
| **Instrumentado** | `-g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer` | Módulos 5–11 |
| **Otimizado** | `-g -O2 -Wall -Wextra` | Módulo 5 |
| **Hardened** | `-O2 -D_FORTIFY_SOURCE=2 -fstack-protector-strong -fPIE -pie` | Módulo 10 |
| **Valgrind** | `-g -O0` **sem** sanitizer | Módulo 7 |

⚠ **`-Wall -Wextra` desde o primeiro programa.** O compilador avisa de metade dos bugs deste curso
**antes** de você rodar. Ignorar aviso é a decisão que torna o bug possível.

⚠ **Sanitizer e `valgrind` não rodam juntos.** Use um ou outro.

---

## ⚠ Nota de propósito

| Você faz | Você **não** faz |
|---|---|
| Provoca bug no **próprio** código | Bug em código de terceiro |
| Lê o diagnóstico do sanitizer | Arma exploit |
| Escreve parser que resiste | Ataca parser alheio |

⚠ **Todo alvo é seu, na sua máquina.** O curso inteiro cabe em `~/c-lab/`.

---

## Como isso destrava os outros cursos

Terminando este, você tem o que faltava para:

| Curso | O que ele precisava de você |
|---|---|
| **Assembly e RE** | Ponteiro, `sizeof`, struct, alinhamento |
| **Malware** | Memória, `malloc`/`free`, leitura de código |
| **Fuzzing** | **Alvo fuzzável**, validação, harness |
| **Exploit Development** | A base inteira |

⚠ **O módulo 11 entrega o parser que o curso de fuzzing usa.** Terminado o curso, você tem alvo que
compila com sanitizer, lê de buffer e valida entrada — os três requisitos.

---

## Ritmo

| Bloco | Duração | Módulos |
|---|---|---|
| **Base** | 3 semanas | 1–4 |
| **O núcleo** | 3 semanas | 5–6 |
| **Ferramenta** | 2 semanas | 7–8 |
| **Aplicação** | 2 semanas | 9–11 |

⚠ **Os módulos 5 e 6 são o curso.** Se você tiver que escolher onde gastar mais tempo, é ali —
são eles que separam quem escreve C de quem entende C.

⚠ **Estimativa a 10 h/semana.** Na prática, multiplique por 1,5 — e não pule os labs dos módulos 6
e 7, que é onde o reflexo se forma.
