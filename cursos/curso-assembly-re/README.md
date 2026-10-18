# Assembly x86-64 e Engenharia Reversa

Curso de 24 horas, oito módulos, do zero ao avançado. Você começa escrevendo assembly e termina
analisando binário real e comparando versões.

**Material original.** Referências abertas estão na [ementa](00-ementa.md).

---

## Por onde começar

Se você nunca leu assembly, **comece pelo Módulo 1 e não pule o Módulo 2**. A maioria das pessoas
que desiste de engenharia reversa desiste no Módulo 2 sem saber — porque tenta entender
instruções antes de entender stack frames, e aí tudo vira sopa de letrinhas.

**Ritmo sugerido:** 2h por semana durante 12 semanas. Assembly exige repetição espaçada; não
funciona em maratona de fim de semana.

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [Arquitetura e o mapa da máquina](modulo-01.md) | 3 | Mapa mental completo de registradores e memória |
| 2 | [Memória, stack e chamadas](modulo-02.md) | 3 | Stack frame desenhado à mão e explicado |
| 3 | [Assembly na prática](modulo-03.md) | 4 | Programa em assembly puro que chama libc |
| 4 | [O compilador como tradutor](modulo-04.md) | 3 | Previsão correta de código gerado por -O0 a -O2 |
| 5 | [Ferramentas de análise](modulo-05.md) | 3 | Binário dissecado com cada ferramenta |
| 6 | [Engenharia reversa aplicada](modulo-06.md) | 4 | Função desconhecida reconstruída em C |
| 7 | [Malware e ofuscação](modulo-07.md) | 2 | Identificação de técnicas sem executar |
| 8 | [Patch diffing e automação](modulo-08.md) | 2 | Diff de versões automatizado |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md)

---

## Ambiente

```bash
# Debian/Ubuntu/Kali
sudo apt update
sudo apt install -y build-essential gcc gdb nasm binutils \
                    file strace ltrace python3 python3-pip
```

Verificação:

```bash
gcc --version       # 11+
gdb --version
nasm -v
objdump --version
uname -m            # deve dizer x86_64
```

⚠ **Se `uname -m` não disser `x86_64`**, você está em ARM (Apple Silicon, por exemplo). O curso
inteiro é x86-64. Rode uma VM x86-64 — não tente adaptar, a ABI é diferente e você vai se
confundir.

### Ghidra

Baixe em https://ghidra-sre.org/ e instale o JDK 17+ antes. É a ferramenta do Módulo 5 em diante.
Alternativa mais leve: `radare2` ou a versão web do `dogbolt`.

---

## Convenções

- Blocos `asm` (NASM, sintaxe Intel) e `gas` (sintaxe AT&T) são marcados. **A diferença de sintaxe
  é a confusão número um de quem começa** — o Módulo 1 explica em detalhe.
- `N O T A` marca o detalhe que costuma travar o aluno.
- `⚠` marca limite legal ou de segurança.
- **Nada neste curso deve ser executado fora de VM isolada.**

---

## Sobre os binários analisados

Todos os alvos são:

1. **Compilados por você** a partir do código-fonte fornecido, ou
2. **Amostras didáticas** escritas para o curso, com comportamento conhecido por mim e
   desconhecido por você até você analisar.

Nenhum malware real. Se você quiser treinar com amostra real depois deste curso, use repositórios
públicos de amostras (como o MalwareBazaar) **em VM sem rede e sem disco compartilhado**.
