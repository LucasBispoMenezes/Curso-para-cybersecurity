#!/usr/bin/env bash
# ============================================================================
#  add-frontmatter.sh
#
#  Escreve o cabecalho YAML (title / nivel / tags) no topo do 00-ementa.md
#  de cada curso.
#
#  Uso:
#     ./add-frontmatter.sh                 # aplica no diretorio atual
#     ./add-frontmatter.sh /caminho/cursos # aplica a partir de outro diretorio
#     ./add-frontmatter.sh --dry-run       # so mostra o que faria
#     ./add-frontmatter.sh --check         # diagnostico, nao escreve
#     ./add-frontmatter.sh --restore       # devolve os backups
#     ./add-frontmatter.sh --fix          # reescreve blocos intactos
#
#  Garantias:
#   - NUNCA duplica o cabecalho. Sempre remove qualquer bloco "---" inicial
#     antes de escrever o novo, quantos existirem.
#   - Idempotente: rodar 2x, 3x, 10x produz o mesmo resultado.
#   - --fix conserta arquivos com bloco duplicado ou corrompido, sem depender
#     de backup.
#   - Faz backup em .frontmatter-backup/ (fora de cursos/).
# ============================================================================

set -euo pipefail

DRY_RUN=0
CHECK_ONLY=0
RESTORE=0
FIX=0
BASE_DIR="."
CORES=1

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --check)   CHECK_ONLY=1 ;;
    --restore) RESTORE=1 ;;
    --fix)     FIX=1 ;;
    --no-color) CORES=0 ;;
    -h|--help)
      sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    -*) echo "Opcao desconhecida: $arg" >&2; exit 2 ;;
    *)  BASE_DIR="$arg" ;;
  esac
done

if [[ -t 1 && "$CORES" == 1 ]]; then
  C_TIT="\033[1;36m"; C_OK="\033[1;32m"; C_AVI="\033[1;33m"
  C_ERR="\033[1;31m"; C_DIM="\033[2m";  C_OFF="\033[0m"
else
  C_TIT=""; C_OK=""; C_AVI=""; C_ERR=""; C_DIM=""; C_OFF=""
fi

info() { printf "  %b\n" "$*"; }
ok()   { printf "  ${C_OK}%b${C_OFF}\n" "$*"; }
avi()  { printf "  ${C_AVI}%b${C_OFF}\n" "$*"; }
err()  { printf "  ${C_ERR}%b${C_OFF}\n" "$*" >&2; }

# ---------------------------------------------------------------------------
# Escapa um valor para YAML entre aspas duplas
# ---------------------------------------------------------------------------
escapar() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

# ---------------------------------------------------------------------------
# Remove TODO bloco de front matter do inicio de um arquivo.
# Devolve o corpo puro no stdout.
#
# Percorre o arquivo e, enquanto a linha for "---" seguida de um bloco
# delimitado por outro "---", descarta. Aceita qualquer quantidade de
# delimitadores seguidos. Foi isso que impedia a duplicacao.
# ---------------------------------------------------------------------------
corpo_puro() {
  awk '
    BEGIN { inicio = 1; dentro = 0 }

    # Primeira linha nao pode ser "---" quando ja saimos do bloco.
    inicio && /^---[[:space:]]*$/ { dentro = 1; inicio = 0; next }
    dentro && /^---[[:space:]]*$/ { dentro = 0; inicio = 1; next }
    dentro { next }

    # Linhas em branco logo apos o bloco nao entram
    { print }
  ' "$1" | sed '/./,$!d'
}
