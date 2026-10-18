# OSINT Global: Investigação em Fonte Aberta Através de Fronteiras

Curso de 36 horas, doze módulos. Ensina a investigar **qualquer identificador, em qualquer
jurisdição** — telefone brasileiro, domínio alemão, empresa em Delaware.

**A tese do curso**

Material de OSINT costuma assumir um país. Este assume o oposto: **o método é global, e as
diferenças nacionais são o conteúdo** — não a exceção.

A pergunta que organiza tudo:

> Dado um identificador — telefone, domínio, empresa, pessoa, imagem — como descubro informação
> sobre ele, **quando ele pode estar em qualquer lugar do mundo?**

⚠ **E o curso não é uma lista de sites.** Lista envelhece em seis meses. O que não envelhece é
**derivar a fonte da estrutura do dado**: `+55` é Brasil, `.de` é Alemanha, NIF espanhol não é o
mesmo formato que NIF português. É isso que você aprende.

**Material original.** Referências na [ementa](00-ementa.md).

---

## Trilha

| # | Módulo | Horas | Você termina com |
|---|---|---|---|
| 1 | [Fundamentos e o ciclo](modulo-01.md) | 2 | O método, e o que "fonte aberta" significa de fato |
| 2 | [O identificador e a jurisdição](modulo-02.md) | 3 | A capacidade de derivar a fonte de qualquer dado |
| 3 | [Busca avançada e superfície oculta](modulo-03.md) | 3 | Operadores, arquivo morto, índice esquecido |
| 4 | [Pessoa: identidade e registro](modulo-04.md) | 3 | Método legal por país, e o que não fazer |
| 5 | [Telefone global](modulo-05.md) | 3 | Um número investigado em dois países |
| 6 | [Empresa e due diligence](modulo-06.md) | 4 | Dossiê com estrutura de propriedade |
| 7 | [Domínio e infraestrutura](modulo-07.md) | 3 | Pivô por certificado e por ASN, em qualquer TLD |
| 8 | [Imagem, vídeo e geolocalização](modulo-08.md) | 4 | Um local determinado por sombra |
| 9 | [Ferramentas e linha de comando](modulo-09.md) | 3 | Coleta automatizada e responsável |
| 10 | [Ética, legalidade e limites](modulo-10.md) | 3 | Saber **quando não fazer** |
| 11 | [Documentação e custódia](modulo-11.md) | 3 | Relatório reprodutível e defensável |
| 12 | [Projeto: caso internacional](modulo-12.md) | 3 | Investigação cruzando três jurisdições |

Extras: [Avaliações](avaliacoes.md) · [Glossário](glossario.md) · [Fontes por jurisdição](fontes/README.md)

---

## ⚠ Antes de qualquer lab

### A fronteira do OSINT

| É OSINT | **Não é** |
|---|---|
| Consultar registro público | Acessar sistema sem autorização |
| Ler site, documento, publicação | **Adquirir base vazada** |
| Comparar dado de fontes abertas | Engenharia social com o alvo |
| Assistir vídeo público e geolocalizar | Instalar software em dispositivo alheio |
| Documentar o que qualquer pessoa vê | Fazer login em conta que não é sua |

⚠ **A fronteira não é "é público?" — é "qualquer pessoa obtém isso sem violar nada?"** Uma base
vazada é "pública" na prática e **não é OSINT**. É dado obtido ilicitamente, e manuseá-lo tem
consequência legal própria.

### Nenhum lab usa pessoa real como alvo

Quatro sujeitos permitidos, e **só** estes:

| Sujeito | Onde | Por quê |
|---|---|---|
| **Identidade fictícia do curso** | Labs 4, 5 | Construída para o exercício |
| **Dado que você mesmo criou** | Labs 5, 7 | Sem terceiro envolvido |
| **A sua própria pegada digital** | Labs 3, 4 | E é o exercício de maior valor prático |
| **Empresa e domínio públicos** | Labs 6, 7 | Sujeitos legítimos de due diligence |

⚠ **Nunca pessoa real.** Nem figura pública, nem conhecido, nem "só para testar". Investigação de
pessoa exige base legal — e o Módulo 10 explica qual.

### O que muda por jurisdição

⚠ **A lição mais importante do curso ser global:** a mesma consulta pode ser legal num país e não
em outro. O que determina **não é onde o dado está** — é onde **você** está e onde **o alvo** está.

| Bloco | Regime | Efeito prático |
|---|---|---|
| Brasil | LGPD | Base legal obrigatória; ANPD fiscaliza |
| UE | GDPR | Proteção ampla; interesse legítimo precisa justificar |
| Reino Unido | UK GDPR | Companies House notavelmente aberto |
| EUA | Setorial + estadual | Muito registro público por padrão |
| Regimes restritivos | Variável | Dado que protege cidadão local pode ser crime obter |

---

## Ambiente

```bash
sudo apt update
sudo apt install -y whois dnsutils exiftool curl jq \
                    python3 python3-pip imagemagick ffmpeg sqlite3
pip3 install phonenumbers requests dnspython
```

⚠ **Todo comando do curso é consulta pública.** Nada faz acesso não autorizado, nada usa base
vazada, nada aborda pessoa.

---

## Como este curso se relaciona com os outros deste material

| Se você quer... | Faça |
|---|---|
| Entender **infraestrutura** de adversário | Curso de APT/C2 (Módulo 6 de lá) |
| Proteger **a sua própria** pegada | Curso de anonimato |
| Análise de **artefato** malicioso | Curso de malware |
| Investigar **identificador** em qualquer país | **Este** |

⚠ **OSINT é a única disciplina deste conjunto que é praticada contra alvo real desde o primeiro
dia.** Isso é o que a torna poderosa e o que exige o Módulo 10 antes de qualquer uso prático.

---

## Nota sobre as fontes

⚠ **Este curso não traz a lista dos 200 registros nacionais.** Ele ensina **como derivar** o
registro a partir do identificador, e dá **casos trabalhados** das jurisdições mais consultadas —
em `fontes/`.

⚠ **Fonte muda.** Site sai do ar, registro muda de URL, serviço vira pago. Por isso o curso ensina
**método**, e o diretório `fontes/` é **ponto de partida datado** — com a data de verificação em
cada entrada.
