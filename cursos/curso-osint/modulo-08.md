# Módulo 8 — Imagem, Vídeo e Geolocalização

**Carga:** 4 horas (1h30 teoria · 2h30 lab)
**Pré-requisitos:** Módulos 1 a 7

---

## Objetivos

1. Extrair metadado de imagem e documento, e saber o que ele revela e o que foi removido.
2. Fazer busca reversa de imagem com critério, entendendo o limite de cada motor.
3. Aplicar o método de geolocalização: contexto, geometria solar, referência cruzada.
4. Determinar a hora de uma foto pela sombra, e a hora pelo céu.
5. Verificar autenticidade de vídeo e imagem — o que é possível e o que não é.

---

## ⚠ Conduta

⚠ **Este módulo tem a técnica com maior potencial de dano à privacidade de terceiro**, porque
geolocalizar uma foto é geolocalizar **uma pessoa**.

| Sujeito permitido | Sujeito proibido |
|---|---|
| Fotografia **sua** | Foto de pessoa em contexto privado |
| Foto de **empresa/entidade pública** (fachada, evento) | Foto que revele residência de alguém |
| **Imagem de referência** de exercício do curso | **Imagem de vítima** ou pessoa sob risco |
| Imagem **pública** de local, sem pessoa identificável | Foto de terceiro identificável |

⚠ **A regra que vale o módulo inteiro:** geolocalizar imagem que mostra **pessoa identificável**
exige base legal, e frequentemente não há. O exercício é geolocalizar **local**, não **quem**.

⚠ **E há uma assimetria que você precisa carregar:** você vai aprender a achar o local de uma
foto. Isso significa que **alguém pode fazer isso com as suas fotos**. O exercício final é sobre
as suas.

---

## 8.1 Metadado — o primeiro passo, e o mais rápido

Antes de olhar o conteúdo, olhe o metadado. Ele acerta o que a análise visual levaria horas.

```bash
mkdir -p ~/osint-lab/lab8 && cd ~/osint-lab/lab8

# Imagem
exiftool foto.jpg

# Os campos que importam para geolocalização
exiftool -GPS:all -DateTimeOriginal -Make -Model -Software -LensModel foto.jpg

# Documento
exiftool documento.pdf | head -25

# Vídeo
exiftool video.mp4 | head -30
ffprobe -v quiet -print_format json -show_format -show_streams video.mp4 | \
  jq '{format: .format.tags, streams: [.streams[] | {codec: .codec_name, tags: .tags}]}'
```

### O que cada campo revela

| Campo | O que dá | Confiabilidade |
|---|---|---|
| **`GPSLatitude` / `GPSLongitude`** | Coordenada | **Alta** se presente — mas removível e editável |
| **`GPSAltitude`, `GPSImgDirection`** | Altitude e direção da câmera | Alta |
| **`DateTimeOriginal`** | Data e **hora** | Alta — a hora é ouro para geometria solar |
| **`Make` / `Model`** | Fabricante e **modelo exato** | Alta — modelo estreita o conjunto |
| **`Software`** | O que editou | Média — revela app e às vezes versão |
| **`SerialNumber`** | ▶ **Série da câmera** | **Alta — identifica o dispositivo** |
| **`Artist` / `Copyright`** | Autor declarado | Baixa — autodeclarado |
| **`XMP` / `IPTC`** | Metadado de agência, descrição, local declarado | Média |
| **`Comment`** | Comentário | Média — frequentemente esquecido |

⚠ **A linha do número de série é a mais subestimada.** Ele identifica o **dispositivo**, não a
pessoa — e permite correlacionar duas fotos como do mesmo aparelho, sem nenhum outro indício.

⚠ **E o `Software` revela muito:** `Adobe Photoshop 24.3` diz que a imagem foi editada (e
provavelmente não é a original); um app de celular diz o sistema; nada diz que o metadado foi
**removido** — e remoção é, ela mesma, informação.

### Metadado removido é informação

| Situação | O que sugere |
|---|---|
| Nenhum EXIF, imagem de câmera | Foi **limpo** — deliberadamente |
| Nenhum EXIF, imagem de rede social | Normal — a plataforma remove |
| EXIF com `Software` de editor | Passou por edição |
| EXIF presente mas **inconsistente** (modelo de 2020, data de 2015) | **Manipulado** |
| GPS presente em foto "anônima" | **Falha grave de quem publicou** |

⚠ **A última linha é o achado que ocorre de verdade.** Documento "anonimizado" com autor no
metadado, foto "sem local" com GPS — são os erros mais comuns e os mais reveladores.

```bash
# Em lote — varrer um diretório
exiftool -r -GPS:all -DateTimeOriginal -SerialNumber -Make -Model . 2>/dev/null | head -40

# Verificar se a imagem tem EXIF algum
exiftool -s -ImageSize -FileType -EXIF:all foto.jpg | head

# Remover metadado (para publicar com segurança)
sudo apt install -y mat2
mat2 --inplace foto.jpg
exiftool foto.jpg   # confirme que sumiu
```

---

## 8.2 Busca reversa de imagem

Encontrar **onde mais** uma imagem aparece.

| Motor | Ponto forte | Limite |
|---|---|---|
| **Yandex** | **Rostos e lugares** — frequentemente o melhor | Foco em resultado visual |
| **Google Imagens** | Cobertura ampla, objeto | Rosto ruim |
| **Bing Visual** | Objeto, produto | Menos cobertura |
| **TinEye** | **Rastreia alteração** — encontra a mais antiga | Base menor |
| **PimEyes** | Rosto | Comercial, e **atenção ética** |

⚠ **A nota do TinEye é a mais valiosa:** ele ordena por **data de aparição mais antiga**, o que
ajuda a **identificar a origem** de uma imagem viral e a detectar reuso antigo.

⚠ **A nota do PimEyes merece uma pausa:** é busca facial comercial. É uma linha que este curso
**não** usa — busca facial por pessoa identificável é investigação de pessoa (Módulo 4), com a
mesma exigência de base legal e o mesmo risco.

### O que a busca reversa responde

| Pergunta | Responde? |
|---|---|
| Esta imagem aparece em outro lugar? | **Sim** |
| Qual é a **versão mais antiga**? | Sim (TinEye) |
| Foi editada? | Parcialmente |
| Quem é a pessoa? | **Não** — e não é o objetivo |
| Onde foi tirada? | **Não** — precisa de análise visual |

⚠ **Busca reversa é **ponto de partida**, não resposta.** Ela encontra reuso; encontrar o **local**
exige o método do §8.3.

---

## 8.3 Geolocalização — o método

Geolocalizar é inferir, e inferir exige **método**. Sem ele, é chute.

```
1. CONTEXTO GERAL      →  O que é isto? (país, tipo de lugar, época)
2. TEXTO VISÍVEL       →  Placa, sinal, cartaz, idioma, alfabeto
3. ESTRUTURA           →  Arquitetura, pavimentação, vegetação, mobiliário urbano
4. INFRAESTRUTURA      →  Poste, hidrante, semáforo, tipo de fiação
5. GEOMETRIA SOLAR     →  Hora pela sombra; direção pela posição do sol
6. REFERÊNCIA CRUZADA  →  Comparar com imagem de mapa ou satélite
7. CONFIRMAÇÃO         →  Múltiplos indícios convergentes → confiança
```

### Cada camada, com o que ela dá

| Camada | O que procurar | Força |
|---|---|---|
| **1. Contexto** | Vegetação, clima, veículo, vestuário | Fraca — estreita para região |
| **2. Texto** | Placa de rua, anúncio, idioma, domínio de e-mail no cartaz | **Forte** |
| **3. Estrutura** | Estilo de construção, telhado, janela, calçada | Média |
| **4. Infraestrutura** | Poste, placa, hidrante, semáforo | **Forte — padrão por jurisdição** |
| **5. Sol** | Sombra, direção, comprimento | **Forte** — e verificável |
| **6. Cruzamento** | Fachada, esquina, satélite | **Confirmatório** |
| **7. Convergência** | Todos juntos | **Achado** |

⚠ **A camada 4 é a mais subestimada e frequentemente a mais decisiva.** Padrão de placa de
trânsito, modelo de hidrante, tipo de poste, formato de tomada em parede — isso é **padrão
nacional**, e reduz o mundo a um país em segundos.

⚠ **A camada 5 é a mais elegante** e a que quase ninguém usa. É o §8.4.

---

## 8.4 Geometria solar — hora pela sombra

O método que transforma uma foto sem texto em informação precisa.

**O princípio:**

```
1. Identifique a DIREÇÃO da sombra na foto
2. Identifique a DIREÇÃO da câmera (para onde ela aponta)
3. A partir dessas duas, você sabe em que direção o SOL estava
4. Sabendo a data (do metadado, ou inferida) e a DIREÇÃO do sol,
   você determina a HORA — porque o sol só está naquela direção naquele momento
```

### O raciocínio, com exemplo

```
Foto de rua, data presumida: 15 de março
Sombra aponta para nordeste na imagem
Câmera aponta para norte
    │
    ▼
O sol está a SUDOESTE
    │
    ▼
No hemisfério norte, em 15 de março, o sol está a sudoeste
    →  no início da tarde (aprox. 14h–15h local)
    │
    ▼
Você tem uma faixa de horário, verificável
```

⚠ **"Faixa de horário" é a resposta honesta — não "14h37".** A sombra dá **intervalo**, e o
intervalo é frequentemente suficiente para corroborar ou refutar uma alegação ("ele disse que
estava em casa à noite").

### Cuidado com a armadilha

| Armadilha | Efeito |
|---|---|
| Foto de **hemisfério sul** | A direção do sol é invertida em relação ao norte |
| **Horário de verão** | Desloca a hora efetiva em uma hora |
| **Latitude alta** (verão polar) | Sol no horizonte por horas; geometria atípica |
| **Sombra de fonte artificial** | Poste de luz à noite, não o sol |
| **Câmera com orientação desconhecida** | Sem saber para onde aponta, o cálculo não fecha |
| **Distorção de lente** | Grande angular distorce a direção aparente |

```bash
# Ferramentas de cálculo solar (use no navegador, ou a biblioteca)
pip3 install pysolar 2>/dev/null || echo "pysolar indisponível — use SunCalc no navegador"

python3 - <<'PY'
try:
    from pysolar.solar import get_azimuth, get_altitude
    import datetime

    # Substitua por: data presumida, coordenada estimada, e faixa de hora
    lat, lon = 48.85, 2.35          # exemplo: Paris
    d = datetime.datetime(2026, 3, 15, tzinfo=datetime.timezone.utc)

    print("Hora UTC  Azimute  Altitude  (Paris, 15/03)")
    print("-" * 45)
    for h in range(6, 20):
        t = d.replace(hour=h)
        az = get_azimuth(lat, lon, t)
        alt = get_altitude(lat, lon, t)
        if alt > 0:
            print(f"{h:>6}h   {az:>7.1f}°  {alt:>7.1f}°")
except ImportError:
    print("Instale pysolar, ou use https://www.suncalc.org/ no navegador")
    print("SunCalc dá a posição do sol para qualquer data e coordenada.")
PY
```

⚠ **Use o `SunCalc` no navegador para trabalho real** — ele aceita coordenada, data e hora, e
mostra a posição do sol numa interface visual. A biblioteca é para automação.

⚠ **E a validação é sempre a mesma:** você **testa a hipótese**. Se a leitura da sombra sugere uma
hora, e a coordenada que você achou tem o sol naquela direção **naquela hora** — hipótese
**corroborada**, não provada. Confiança moderada, e se declara.

---

## 8.5 Satélite e mapa

Fontes abertas de imagem de superfície, e o que elas permitem.

| Fonte | O que dá | Resolução típica |
|---|---|---|
| **Google / Bing Maps** | Imagem de superfície, historicamente datada | Alta em cidade |
| **OpenStreetMap** | Mapa colaborativo, **dado**, não só imagem | Vetorial |
| **Sentinel (Copernicus)** | Imagem **gratuita**, com data, reprocessável | 10 m |
| **Landsat (USGS)** | Série histórica longa, gratuita | 30 m |
| **EarthExplorer (USGS)** | Catálogo de imagem | Variada |
| **Google Earth** | Histórico de imagem por data | Alta |

⚠ **A linha do Sentinel é a mais útil para OSINT profissional** porque é **gratuita, datada e
reprocessável** — você consegue comprovar **quando** uma imagem foi feita, o que é essencial para
cadeia de custódia (Módulo 11). Imagem de mapa comercial é datada de forma imprecisa.

⚠ **O histórico do Google Earth é o mais prático para mudança**: você compara a mesma esquina em
2015, 2020 e 2025. Isso confirma ou refuta quando uma construção apareceu.

---

## 8.6 Verificar autenticidade

O que é possível e o que não é.

| Verificação | Possível? | Como |
|---|---|---|
| A imagem foi editada? | **Parcialmente** | Análise de nível de compressão, inconsistência de ruído |
| O metadado foi alterado? | **Sim** | Inconsistência entre campos; `Software` de editor |
| A foto é do local que alega? | **Sim, por convergência** | Método do §8.3 |
| A foto é de quando alega? | **Parcialmente** | Sombra + referência; para satélite, data da fonte |
| O vídeo foi editado? | **Parcialmente** | Análise de quadro, ruído, continuidade |
| O vídeo é de outra fonte? | **Sim** | Busca reversa **de quadro** (extraia o quadro e busque) |
| É deepfake? | **Muito difícil** | Nenhum método de fonte aberta é conclusivo |

⚠ **A última linha é a mais importante e a mais honesta.** Detecção de deepfake por análise visual
é **não confiável** — modelos melhoram mais rápido que detectores, e o resultado de uma análise
visual não sustenta conclusão em relatório.

**O que fazer em vez disso:** verificar **proveniência** — quem publicou **primeiro**, por qual
canal, e se há fonte primária. Isso é mais robusto que procurar artefato de geração.

```bash
# Extrair quadro de vídeo para busca reversa
ffmpeg -i video.mp4 -vf "select=eq(n\,0)" -vframes 1 quadro-0.png -y 2>/dev/null
ffmpeg -ss 00:00:05 -i video.mp4 -vframes 1 quadro-5s.png -y 2>/dev/null

echo "Agora faça busca reversa de quadro-0.png em Yandex e TinEye"
echo "TinEye dá a ocorrência mais antiga — é o que você quer para proveniência"
```

---

## 8.7 LAB — Geolocalização de local sem pessoa

**Duração:** 150 min

⚠ **Sujeito: imagem sua, ou imagem pública de local sem pessoa identificável.** Nunca foto de
terceiro em contexto privado.

### Passo 1 — Metadado (25 min)

```bash
cd ~/osint-lab/lab8

# 1. SUA foto (do celular, ou uma que você tem direito)
exiftool -a -G1 -s foto-sua.jpg | head -40

# 2. Campos que importam
exiftool -GPS:all -DateTimeOriginal -Make -Model -SerialNumber -Software foto-sua.jpg

# 3. Um documento seu
exiftool documento-seu.pdf 2>/dev/null | head -20
```

Produza `metadado.md`:

| Campo | Presente? | Valor | O que revela |
|---|---|---|---|
| GPS | | | |
| Data/hora original | | | |
| Fabricante / modelo | | | |
| Número de série | | | |
| Software | | | |
| Autor | | | |

**Responda:**

1. Sua foto tem **GPS**? Se sim, ela revela o **local exato** — o que isso significa para você
   ao publicá-la?
2. O **modelo** e o **série** identificam o dispositivo. Isso te preocupa?
3. Você tem metadado em documento que publicou? O que ele revela?
4. **Limpe o metadado** de uma cópia, e confirme com `exiftool` que sumiu.

⚠ **A resposta 1 é o ponto pessoal do módulo.** A maioria das pessoas publica foto do celular com
GPS ativo sem saber. Você acabou de descobrir se é o seu caso.

### Passo 2 — Geolocalização por método (60 min)

⚠ **Escolha um dos dois:**

**Opção A — a sua própria foto.** Aqui você tem a verdade para verificar o método: você sabe onde
foi tirada. Faça o método e veja se ele chega ao lugar certo — e **onde ele erra**.

**Opção B — a imagem de referência do curso.** Uma imagem pública de **local sem pessoa**,
disponibilizada junto com este módulo (ponto de ônibus, fachada, praça). Você aplica o método sem
saber a resposta, e a confirmação vem no fim.

```bash
mkdir -p metodo && cd metodo

cat > geoloc.md <<'EOF'
# Geolocalização pelo método

## Imagem analisada
Descrição: (o que se vê, sem interpretar ainda)

## Camada 1 — Contexto
Vegetação: | Clima: | Veículo: | Vestuário:
→ Região provável:

## Camada 2 — Texto visível
| Texto | Idioma/alfabeto | O que sugere |
→ País provável:

## Camada 3 — Estrutura
| Elemento arquitetônico | Estilo | O que sugere |

## Camada 4 — Infraestrutura
| Item | Padrão observado | Jurisdição que sugere |
| poste, placa, hidrante, semáforo, fiação |

## Camada 5 — Geometria solar
Data presumida:
Direção da câmera:
Direção da sombra:
→ Direção do sol:
→ Faixa de horário:
Verificação (SunCalc):

## Camada 6 — Referência cruzada
Mapa/satélite consultado:
Convergência encontrada:

## Camada 7 — Confirmação
Indícios convergentes: (mínimo 3)
Confiança: alta / moderada / baixa
O que NÃO foi possível concluir:
EOF
echo "Preencha cada camada com o que OBSERVOU — sem pular para o palpite."
```

**Responda:**

1. **Quantas camadas** você precisou para chegar a um país?
2. Qual camada foi **decisiva**? E qual foi inútil no seu caso?
3. A camada 5 (sol) **confirmou** ou **contradisse** o que as outras sugeriam?
4. **Qual foi a sua maior dificuldade** — e o que você faria diferente?

⚠ **A resposta 3 é o exercício do §8.4.** Se o sol contradiz, você tem um erro em algum lugar — e
achar qual é o aprendizado.

### Passo 3 — Busca reversa e proveniência (35 min)

```bash
# Se você usou a Opção A (foto sua), teste o inverso:
# a busca reversa da SUA foto encontra o que você publicou?

echo "Roteiro:"
cat <<'EOF'
1. Yandex Imagens   → cole ou envie a imagem → veja rostos/lugares
2. TinEye           → envie → veja a ocorrência MAIS ANTIGA
3. Google Imagens   → envie → veja reuso
4. Anote: quantos resultados? De onde? Qual a data mais antiga?
EOF
```

Produza `reversa.md`:

| Motor | Resultados | Ocorrência mais antiga | O que encontrou |
|---|---|---|---|
| Yandex | | | |
| TinEye | | | |
| Google | | | |

**Responda:**

1. A busca reversa **respondeu onde** a foto foi tirada? (Certifique-se de que a resposta é "não".)
2. Ela encontrou **reuso**? De onde?
3. O TinEye achou uma versão **mais antiga** que a sua fonte? O que isso significa?
4. **Qual a diferença entre busca reversa e geolocalização**, e por que as duas se confundem?

### Passo 4 — As suas próprias fotos publicadas (30 min)

⚠ **O exercício de maior valor prático.**

| Plataforma | Remove metadado? | O que ela **ainda** revela |
|---|---|---|
| WhatsApp | **Sim** (por padrão) | Hora de envio, e o que está na imagem |
| Instagram | **Sim** | Local declarado (se você marcou), hora |
| Facebook | **Sim** | Local (se marcou) |
| Telegram (arquivo) | **Não** — envia original | **TUDO, incluindo GPS** |
| E-mail | **Não** | TUDO |
| Google Drive / Dropbox | **Não** | TUDO |
| Site próprio | **Não** | TUDO |

⚠ **A linha do Telegram é o achado mais surpreendente para a maioria.** Enviar **como arquivo**
(anexo) preserva metadado; enviar como **foto** comprime e remove. A diferença é uma opção na
interface — e a maioria não sabe que ela existe.

Produza `minhas-fotos.md`:

| Foto publicada | Onde | Metadado preservado? | O que revela |
|---|---|---|---|
| | | | |

**Responda:**

1. Alguma foto que você publicou **preservou GPS**? Onde?
2. Você usa Telegram como arquivo? O que isso expõe?
3. **Que foto você vai tirar do ar?** (Ou limpar antes de republicar?)
4. **O que você muda** no seu hábito de publicar, a partir de agora?

### Critérios de aceitação

- `metadado.md` com a tabela preenchida e você **limpou** um arquivo com `mat2`, confirmando.
- `geoloc.md` com **as sete camadas** preenchidas, **sem pular para o palpite**.
- Você identificou **quantas camadas** foram necessárias e qual foi decisiva.
- A camada 5 (sol) foi calculada com **SunCalc** ou `pysolar`, com o resultado registrado.
- `reversa.md` com os três motores e a **ocorrência mais antiga** identificada.
- Você explicou a diferença entre busca reversa e geolocalização.
- `minhas-fotos.md` com pelo menos **uma** foto sua analisada.
- Você respondeu o que muda no seu hábito de publicar.
- ⚠ Nenhuma pessoa identificável foi alvo de geolocalização.

---

## Avaliação

1. Cite seis campos de EXIF e o que cada um revela para uma investigação.
2. Por que o **número de série da câmera** é subestimado? O que ele permite?
3. O que significa "nenhum EXIF em imagem de câmera"? E em imagem de rede social?
4. Por que metadado **inconsistente** é mais revelador que metadado ausente?
5. Compare Yandex, Google, TinEye e PimEyes em ponto forte. Por que este curso **não** usa busca
   facial?
6. Descreva as sete camadas do método de geolocalização.
7. **Qual camada é a mais subestimada e por quê?** Dê um exemplo concreto.
8. Explique o método da sombra em cinco passos. Por que a resposta é "faixa", não "hora exata"?
9. Cite três armadilhas do cálculo solar e o efeito de cada uma.
10. Por que a imagem do Sentinel é melhor que mapa comercial para relatório? O que ela oferece que
    o mapa não oferece?
11. Por que detecção de deepfake por análise visual **não** sustenta conclusão? O que fazer em vez?
12. Por que enviar foto "como arquivo" no Telegram preserva metadado? Qual a consequência?
13. Por que "geolocalizar a sua própria foto" é o exercício de maior valor, e o que ele revela?

---

**Próximo:** [Módulo 9 — Ferramentas e linha de comando](modulo-09.md)
