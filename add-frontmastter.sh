#!/usr/bin/env bash
# ============================================================================
#  add-frontmatter.sh
#
#  Injeta o cabecalho YAML (title / nivel / tags) no topo do 00-ementa.md
#  de cada curso.
#
#  Uso:
#     ./add-frontmatter.sh                 # aplica no diretorio atual
#     ./add-frontmatter.sh /caminho/cursos # aplica a partir de outro diretorio
#     ./add-frontmatter.sh --dry-run       # so mostra o que faria
#     ./add-frontmatter.sh --check         # lista quais ja tem / quais faltam
#
#  Seguro para rodar 2x: se o arquivo ja comeca com "---", ele e pulado.
#  Backups vao para .frontmatter-backup/ (fora de cursos/).
# ============================================================================

set -euo pipefail

DRY_RUN="${DRY_RUN:-0}"
CHECK_ONLY="${CHECK_ONLY:-0}"
BASE_DIR="."
CORES=1
BACKUP_DIR=".frontmatter-backup"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --check)   CHECK_ONLY=1 ;;
    --no-color) CORES=0 ;;
    -h|--help)
      sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    -*) echo "Opcao desconhecida: $arg" >&2; exit 2 ;;
    *)  BASE_DIR="$arg" ;;
  esac
done

if [[ -t 1 && "$CORES" == 1 ]]; then
  C_TIT="\033[1;36m"; C_OK="\033[1;32m"; C_AVI="\033[1;33m"
  C_ERR="\033[1;31m";  C_DIM="\033[2m";  C_OFF="\033[0m"
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
# Tabela: curso -> titulo | nivel | tags
# ---------------------------------------------------------------------------
titulo() { # $1 = nome da pasta
  case "$1" in
    curso-anonimato)           echo "Anonimato e Privacidade na Internet: Tor, Proxies e o que Realmente Protege" ;;
    curso-assembly-re)         echo "Assembly x86-64 e Engenharia Reversa: do Zero ao Avancado" ;;
    curso-bash-ofensivo)       echo "Bash Ofensivo: Automacao para Pentest" ;;
    curso-c-seguranca)         echo "C para Pesquisa de Seguranca: Memoria, Bug e Comportamento Indefinido" ;;
    curso-linux-seguranca)     echo "Linux para Seguranca: O Sistema Como Superficie" ;;
    curso-osint)               echo "OSINT Global: Investigacao em Fonte Aberta Atraves de Fronteiras" ;;
    curso-redes)               echo "Redes para Profissionais de Seguranca: do Cabo ao Pacote" ;;
    curso-criptografia)        echo "Criptografia Aplicada e Falhas: Onde o Algoritmo Esta Certo e o Sistema Quebra" ;;
    curso-pesquisa-seguranca)  echo "Pesquisa em Seguranca: O Metodo Antes da Tecnica" ;;
    curso-enumeracao)          echo "Enumeracao Esoterica: A Superficie que a Ferramenta Nao Ve" ;;
    curso-malware)             echo "Malware, Ransomware e Agentes de Ameaca: Analise Defensiva" ;;
    curso-apt-c2)              echo "APT e Infraestrutura de C2: Analise Defensiva" ;;
    curso-deteccao-evasao)     echo "Deteccao e Evasao: O Jogo" ;;
    curso-exploit)             echo "Exploit Development: Da Corrupcao de Memoria ao Controle de Fluxo" ;;
    curso-fuzzing)             echo "Fuzzing e Pesquisa de Vulnerabilidades: do Zero ao Achado Reproduzivel" ;;
    curso-fuzzing-avancado)    echo "Fuzzing Avancado: Dirigido, Estrutural e Diferencial" ;;
    curso-http-smuggling)      echo "HTTP Smuggling e Confusao de Camada: O Framing Como Ataque" ;;
    curso-parser-differentials) echo "Parser Differentials: Onde Duas Implementacoes Discordam" ;;
    curso-patch-diffing)       echo "Analise Diferencial de Patch: Do Diff ao Achado" ;;
    *) return 1 ;;
  esac
}

# nivel conforme a lista que voce definiu
nivel() {
  case "$1" in
    curso-bash-ofensivo|curso-redes|curso-osint|curso-anonimato)
      echo "basico" ;;
    curso-assembly-re|curso-linux-seguranca|curso-c-seguranca|curso-malware|curso-apt-c2)
      echo "intermediario" ;;
    curso-enumeracao|curso-criptografia|curso-pesquisa-seguranca|curso-fuzzing)
      echo "avancado" ;;
    curso-exploit|curso-patch-diffing|curso-parser-differentials|curso-http-smuggling|curso-deteccao-evasao|curso-fuzzing-avancado)
      echo "especialista" ;;
    *) return 1 ;;
  esac
}

tags() {
  case "$1" in
    curso-anonimato)            echo "[anonimato, tor, vpn, opsec, fingerprint, trafego]" ;;
    curso-assembly-re)          echo "[assembly, x86-64, engenharia-reversa, ghidra, binario, disassembly]" ;;
    curso-bash-ofensivo)        echo "[bash, shell, automacao, pentest, script]" ;;
    curso-c-seguranca)          echo "[c, memoria, ub, sanitizer, ponteiro, corrupcao]" ;;
    curso-linux-seguranca)      echo "[linux, proc, permissoes, namespace, setuid, capability]" ;;
    curso-osint)                echo "[osint, investigacao, fonte-aberta, jurisdicao, due-diligence, verificacao]" ;;
    curso-redes)                echo "[redes, tcp-ip, tcpdump, pacote, dns, tls]" ;;
    curso-criptografia)         echo "[criptografia, aes, tls, kdf, nonce, padding-oracle]" ;;
    curso-pesquisa-seguranca)   echo "[pesquisa, metodologia, cve, patch, hipotese, metodo]" ;;
    curso-enumeracao)           echo "[enumeracao, dns, certificado, superficie, reconhecimento, ct-logs]" ;;
    curso-malware)              echo "[malware, analise, yara, sandbox, packing, lolbin]" ;;
    curso-apt-c2)               echo "[apt, c2, persistencia, infraestrutura, pivoting, deteccao]" ;;
    curso-deteccao-evasao)      echo "[deteccao, evasao, waf, sigma, falso-positivo, telemetria]" ;;
    curso-exploit)              echo "[exploit, rop, aslr, heap, use-after-free, controle-de-fluxo]" ;;
    curso-fuzzing)              echo "[fuzzing, afl, cobertura, crash, triagem, harness]" ;;
    curso-fuzzing-avancado)     echo "[fuzzing, diferencial, corpus, gramatica, cobertura, triagem]" ;;
    curso-http-smuggling)       echo "[http, smuggling, framing, desync, http-2, proxy]" ;;
    curso-parser-differentials) echo "[parser, differential, framing, waf, harness, divergencia]" ;;
    curso-patch-diffing)        echo "[patch, diff, binario, 1-day, variant, ghidra]" ;;
    *) return 1 ;;
  esac
}

# ---------------------------------------------------------------------------
# Localiza o diretorio que contem as pastas "curso-*"
# ---------------------------------------------------------------------------
if [[ -d "$BASE_DIR/cursos" ]]; then
  RAIZ="$BASE_DIR/cursos"
elif compgen -G "$BASE_DIR/curso-*" > /dev/null 2>&1; then
  RAIZ="$BASE_DIR"
else
  err "Nao achei pastas curso-* em: $BASE_DIR"
  err "Passe o caminho: $0 /caminho/para/Cursos"
  exit 1
fi

printf "\n${C_TIT}Frontmatter nas ementas${C_OFF}\n"
printf "${C_DIM}  raiz: %s${C_OFF}\n" "$RAIZ"
[[ "$DRY_RUN" == 1 ]] && avi "  MODO DRY-RUN — nada sera escrito"
[[ "$CHECK_ONLY" == 1 ]] && avi "  MODO CHECK — so diagnostico"
printf "\n"

# ---------------------------------------------------------------------------
# Aplica
# ---------------------------------------------------------------------------
n_aplicados=0; n_ok=0; n_falta=0; n_sem=0
n_pulados_existentes=0; n_reparados=0

for dir in "$RAIZ"/curso-*; do
  [[ -d "$dir" ]] || continue
  curso="$(basename "$dir")"
  alvo="$dir/00-ementa.md"

  if ! titulo "$curso" > /dev/null 2>&1; then
    avi "? $curso — nao esta na tabela, ignorado"
    (( n_sem++ )) || true
    continue
  fi

  if [[ ! -f "$alvo" ]]; then
    err "! $curso — sem 00-ementa.md"
    (( n_sem++ )) || true
    continue
  fi

  primeira="$(head -n 1 "$alvo")"

  if [[ "$primeira" == "---" ]]; then
    # Ja tem frontmatter: verifica se o title esta entre aspas.
    linha_title="$(grep -m1 '^title:' "$alvo" || true)"

    if [[ -n "$linha_title" && ! "$linha_title" =~ ^title:[[:space:]]*\" ]]; then
      # Title sem aspas — provavel causa do YAML invalido.
      if [[ "$CHECK_ONLY" == 1 ]]; then
        avi "! $curso — frontmatter presente, mas title SEM aspas"
        (( n_falta++ )) || true
        continue
      fi

      if [[ "$DRY_RUN" == 1 ]]; then
        printf "  ${C_TIT}~ %s${C_OFF} ${C_DIM}(reparar aspas do title)${C_OFF}\n" "$curso"
        continue
      fi

      mkdir -p "$BACKUP_DIR"
      [[ -f "$BACKUP_DIR/$curso.md" ]] || cp "$alvo" "$BACKUP_DIR/$curso.md"

      # Reconstroi o bloco inteiro, agora com aspas
      corpo="$(sed '1{/^---$/d}; /^---$/,/^---$/d' "$alvo" | sed '1{/^$/d}')"
      bloco="$(printf -- '---\ntitle: "%s"\nnivel: %s\ntags: %s\n---\n\n' \
                "$(escapar "$(titulo "$curso")")" "$(nivel "$curso")" "$(tags "$curso")")"
      printf '%s%s\n' "$bloco" "$corpo" > "$alvo"

      ok "~ $curso — title reparado ($(nivel "$curso"))"
      (( n_reparados++ )) || true
      continue
    fi

    if [[ "$CHECK_ONLY" == 1 ]]; then
      ok "= $curso — ja tem frontmatter"
    else
      info "${C_DIM}= $curso — ja tem, pulado${C_OFF}"
    fi
    (( n_ok++ )) || true
    continue
  fi

  if [[ "$CHECK_ONLY" == 1 ]]; then
    avi "- $curso — SEM frontmatter"
    (( n_falta++ )) || true
    continue
  fi

  if [[ "$DRY_RUN" == 1 ]]; then
    printf "  ${C_TIT}+ %s${C_OFF} ${C_DIM}(%s)${C_OFF}\n" "$curso" "$(nivel "$curso")"
    n_aplicados=$((n_aplicados+1))
    continue
  fi

  mkdir -p "$BACKUP_DIR"
  [[ -f "$BACKUP_DIR/$curso.md" ]] || cp "$alvo" "$BACKUP_DIR/$curso.md"

  bloco="$(printf -- '---\ntitle: "%s"\nnivel: %s\ntags: %s\n---\n\n' \
            "$(escapar "$(titulo "$curso")")" "$(nivel "$curso")" "$(tags "$curso")")"

  tmp="$(mktemp)"
  { printf '%s' "$bloco"; cat "$alvo"; } > "$tmp"
  mv "$tmp" "$alvo"

  ok "+ $curso — $(nivel "$curso")"
  (( n_aplicados++ )) || true
done

# ---------------------------------------------------------------------------
# Resumo
# ---------------------------------------------------------------------------
printf "\n${C_TIT}Resumo${C_OFF}\n"
if [[ "$CHECK_ONLY" == 1 ]]; then
  info "com frontmatter:      ${C_OK}${n_ok}${C_OFF}"
  info "precisando de ajuste: ${C_AVI}${n_falta}${C_OFF}"
else
  info "aplicados:   ${C_OK}${n_aplicados}${C_OFF}"
  info "reparados:   ${C_OK}${n_reparados}${C_OFF}"
  info "ja tinham:   ${n_ok}"
fi
[[ "$n_sem" -gt 0 ]] && avi "ignorados:   ${n_sem}"
info "backups:     ${C_DIM}${BACKUP_DIR}/ (apague depois de conferir)${C_OFF}"
printf "\n"

if [[ "$n_aplicados" -gt 0 || "$n_reparados" -gt 0 ]]; then
  [[ "$DRY_RUN" == 0 ]] && ok "Pronto. Confira 1 arquivo antes de comitar."
fi
exit 0
