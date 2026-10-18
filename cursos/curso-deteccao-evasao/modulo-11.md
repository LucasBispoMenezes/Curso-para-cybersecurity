# Módulo 11 — Projeto: A Regra Medida

**Carga:** 2 horas
**Pré-requisitos:** Módulos 1 a 10

---

## O objetivo do módulo

**Um entregável:** uma regra de detecção **completa e medida** — **com taxa de detecção, taxa de
falso positivo, orçamento, lacunas declaradas e histórico de ciclo.**

⚠ **E o entregável não é a regra.** É a **regra com os números** — **porque uma regra sem número não
é auditável.**

| Resultado | É projeto válido? |
|---|---|
| Regra medida, dentro do orçamento | ✓✓ **Sim** |
| Regra medida, **acima** do orçamento — e você ajusta | ✓✓ **Sim** |
| Regra **aposentada**, com registro | ✓ **Sim — e é raro** |
| Regra escrita, sem medir | ⚠ **Não** |
| "Escrevi um regex" | ⚠ **Não** |

⚠ **A terceira linha é a que quase ninguém entrega** — **e é a mais honesta.** **Aposentar com
registro é uma decisão de engenharia.**

---

## ⚠ Nota de conduta

| Você faz | Você **não** faz |
|---|---|
| Regra no **seu** sensor | ⚠ Testar WAF de terceiro |
| Ataque **simulado** no lab | ⚠ Ataque contra alvo real |
| Evasão **para testar** a regra | ⚠ Evasão para atacar |
| Tráfego legítimo **do seu lab** | ⚠ Tráfego de produção alheia |
| **Reporta** a falha | ⚠ Publica o bypass |

⚠ **A linha específica deste curso:** **você escreve evasão.** **E ela é dual-use.**
**A declaração de que ela serve para **medir**, e não para atacar, é parte do entregável.**

---

## 11.1 O que você vai produzir

```
projeto-deteccao/
├── 00-alvo.md             o ataque escolhido, com critério
├── 01-superficie.md       o inventário e o ponto de observação
├── 02-regra.md            a regra, com a família e a origem
├── 03-normalizacao.md     a transformação medida (módulo 4)
├── 04-fp.md               a medição do falso positivo (módulo 6)
├── 05-orcamento.md        a conta, e o veredito
├── 06-evasao.md           a resistência às sete famílias
├── 07-ciclo.md            as voltas, e o ganho marginal
├── 08-relatorio.md        O ENTREGÁVEL
├── 09-lacunas.md          o que a regra NÃO pega
└── 10-declaracao.md       conduta
```

⚠ **A ordem é a ordem do curso** — **e `09-lacunas.md` não é opcional.**

---

## 11.2 As fases

### Fase 1 — Alvo e superfície (25 min)

**Produza `00-alvo.md`:**

```markdown
# O alvo

## 1. O ataque
| Item | Valor |
|---|---|
| a variante | |
| de qual curso veio | |
| ⚠ eu reproduzo? | |

## 2. O critério da escolha
| Critério | Avaliação |
|---|---|
| deixa RASTRO | |
| o rastro é DISTINGUÍVEL | |
| tráfego legítimo é fácil | |
| não é HTTP/2 nem client-side | |

## 3. O que eu NÃO vou detectar
| Ataque | Por quê |
|---|---|
| | |

## 4. O que eu NÃO vou fazer
- [ ] não testo WAF, SIEM ou sensor de terceiro
- [ ] não uso a evasão contra alvo real
- [ ] não publico bypass de produto vivo
- [ ] não rodo tráfego de outro ambiente
```

**Produza `01-superficie.md`:**

```markdown
# A superfície (módulo 2)

## As fontes
| # | Fonte | Existe? | Retém? | Acessível? | ⚠ Vê o ataque? |
|---|---|---|---|---|---|
| | | | | | |

## O ponto escolhido
| Item | Valor |
|---|---|
| ponto | |
| o que ele NÃO vê | |
| ⚠ o que eu aceito não ver | |
| retenção necessária | |

## O isolamento
| Item | Valor |
|---|---|
| tudo em | 127.0.0.1 |
| teste que falha | [ ] feito |
```

### Fase 2 — A regra e a normalização (30 min)

**Produza `02-regra.md`:**

```markdown
# A regra

## 1. Identificação
| Item | Valor |
|---|---|
| id | |
| família (módulo 3) | |
| o que detecta | |
| onde roda | |

## 2. A definição
```yaml
[cole a regra]
```

## 3. Por que esta família
| Alternativa | Por que não |
|---|---|
| assinatura | |
| comportamento | |
| anomalia | |

## 4. A hipótese (módulo 7)
| Campo | Valor |
|---|---|
| técnica (ATT&CK) | |
| comportamento | |
| rastro | |
| ⚠ FALSIFICAÇÃO | |
```

**Produza `03-normalizacao.md`:**

```markdown
# A normalização (módulo 4)

## A transformação medida
| Caso | O backend registrou |
|---|---|
| 0 codificações | |
| 1 codificação | |
| 2 codificações | |

⚠ n_decodificacoes = ____

## A forma ORIGINAL está logada?
| Item | Valor |
|---|---|
| o sensor registra a forma crua? | |
| se não, a regra alinhada é possível? | |

## As evasões por encoding
| # | Forma | A regra pega? |
|---|---|---|
| 1 | literal | |
| 2 | 1× | |
| 3 | 2× | |
| 4 | aninhamento | |
```

### Fase 3 — O FP e o orçamento (30 min)

**Produza `04-fp.md`:**

```markdown
# O falso positivo (módulo 6)

## A medição
| Item | Valor |
|---|---|
| eventos legítimos | |
| alertas | |
| ⚠ FP/evento | |
| precisão | |

## O método
```
o comando que gerou o tráfego legítimo
```
```
a saída literal
```

## Os ajustes, e o trade-off
| # | Ajuste | ΔFP | ⚠ ΔFN |
|---|---|---|---|
| | | | |

## A lista de exclusão
| # | Exclusão | ⚠ Dívida? |
|---|---|---|
| | | |
```

**Produza `05-orcamento.md`:**

```markdown
# O orçamento

## A conta
| Item | Valor |
|---|---|
| alertas/dia (estimado) | |
| min por alerta | |
| gasto/dia | |
| orçamento do time | |
| ⚠ USO | |

## O veredito
| Item | Valor |
|---|---|
| dentro do orçamento? | |
| ⚠ ação | manter / ajustar / **aposentar** |
```

### Fase 4 — Evasão e ciclo (25 min)

**Produza `06-evasao.md`:**

```markdown
# A evasão (módulo 9)

## As sete famílias
| # | Família | Casa? | Lacuna? |
|---|---|---|---|
| 1 | encoding | | |
| 2 | case | | |
| 3 | aninhamento | | |
| 4 | delimitador | | |
| 5 | fragmentação | | |
| 6 | ambiguidade | | |
| 7 | volume | | |

## A resistência
| Item | Valor |
|---|---|
| testáveis | |
| pegas | |
| ⚠ resistência | |

## As que eu corrigi
| Família | Correção | ΔFP |
|---|---|---|
| | | |
```

**Produza `07-ciclo.md`:**

```markdown
# O ciclo (módulo 8)

## As voltas
| Volta | Evasão | Detecção | FP | Δ | Veredito |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

## O ganho marginal
| Item | Valor |
|---|---|
| platô na volta | |
| ⚠ o ajuste foi | ganho / **troca** |

## As regras aposentadas
| Regra | Taxa que tinha | Motivo | ⚠ Lacuna deixada |
|---|---|---|---|
| | | | |
```

### Fase 5 — Relatório, lacunas e conduta (10 min)

**Produza `08-relatorio.md`** com as **doze** seções:

```markdown
# Relatório — a regra medida

## 1. Identificação
| Item | Valor |
|---|---|
| regra | |
| família | |
| o ataque que ela cobre | |

## 2. O ponto de observação
| Item | Valor |
|---|---|
| onde roda | |
| ⚠ o que NÃO vê | |
| o que aceito não ver | |

## 3. A regra (literal)
```yaml
[cole]
```

## 4. A normalização
| Item | Valor |
|---|---|
| n_decodificacoes do backend | |
| a regra imita esse número? | |

## 5. As métricas
| Métrica | Valor | Método |
|---|---|---|
| detecção | | |
| FP | | |
| precisão | | |
| custo | | |

## 6. O orçamento
| Item | Valor |
|---|---|
| uso | |
| veredito | |

## 7. ⚠ A resistência às sete famílias
| # | Família | Casa? |
|---|---|---|
| | | |

## 8. O ciclo
| Volta | Δ detecção | Δ FP | Ganho ou troca |
|---|---|---|---|
| | | | |

## 9. ⚠ O que a regra NÃO pega
| # | Lacuna | Tipo | Contramedida | Status |
|---|---|---|---|---|
| | | detecção / instrumentação | | |

## 10. O que eu NÃO fiz
- [ ] não testei sensor de terceiro
- [ ] não usei a evasão contra alvo real
- [ ] não publiquei bypass
- [ ] não rodei tráfego de outro ambiente
- [ ] não calculei severidade

## 11. O que cada responsável precisa saber
| # | Item |
|---|---|
| 1 | a regra está dentro do orçamento? |
| 2 | qual lacuna fica aberta, e por quê |

## 12. O que NÃO foi verificado
⚠ mínimo 3
```

**Produza `09-lacunas.md`:**

```markdown
# Declaração de lacunas

| # | Família | Por quê | Contramedida | Status |
|---|---|---|---|---|
| 1 | aninhamento | a remoção cria o padrão | rejeitar a forma | aberta |
| 2 | fragmentação | dividido entre camadas | instrumentar | aberta |
| 3 | ambiguidade | a regra está na camada errada | correlacionar | aberta |
| 4 | volume | é o orçamento, não a assinatura | rate limit | aberta |
| 5 | encoding profundo | sem contramedida fiável | — | ⚠ ACEITA |

## O que esta declaração resolve
⚠ ela NÃO elimina a lacuna.
✓ ela torna a regra AUDITÁVEL.

## O que cada lacuna exige
| Lacuna | Exige |
|---|---|
| aninhamento | decisão de produto (rejeitar) |
| fragmentação | instrumentação |
| ambiguidade | instrumentação do backend |
| volume | orçamento e limite |
```

**Produza `10-declaracao.md`:**

```markdown
# Declaração de conduta

## O laboratório
| Item | Valor |
|---|---|
| o atacante | ⚠ simulado, do curso anterior |
| a regra | roda no MEU sensor |
| o tráfego legítimo | gerado por mim, ou sintético |
| ⚠ terceiros | **NENHUM** |

## Declaro que
- [ ] não testei WAF, SIEM, CDN ou sensor de terceiro
- [ ] não usei a evasão contra nenhum alvo real
- [ ] não rodei tráfego de outro ambiente
- [ ] não guardei payload de terceiros
- [ ] não publiquei bypass de produto vivo
- [ ] declarei as lacunas da regra
- [ ] medi o falso positivo em vez de estimá-lo
- [ ] declarei o que NÃO verifiquei

## E declaro que ENTENDO que
- [ ] a evasão que escrevi serve para MEDIR a detecção
- [ ] dual-use não é licença: o destino é o que define
- [ ] uma regra sem taxa é uma promessa, não engenharia
- [ ] medir detecção e atacar são coisas diferentes

Data: ____
```

---

## 11.3 A rubrica

| # | Item | Peso |
|---|---|---|
| 1 | **Superfície** com o inventário testado | 10% |
| 2 | **A regra**, com a família justificada | 15% |
| 3 | **A normalização medida** | 10% |
| 4 | ⚠ **O FP medido**, com tráfego legítimo | 20% |
| 5 | **O orçamento** e o veredito | 10% |
| 6 | **A resistência** às sete famílias | 15% |
| 7 | **O ciclo**, com o ganho marginal | 5% |
| 8 | ⚠ **As lacunas declaradas** | 10% |
| 9 | **Relatório** com o que não prova | 5% |

**Penalidades automáticas:**

- Testou sensor de terceiro: **projeto zerado**.
- Usou a evasão contra alvo real: **projeto zerado**.
- Publicou bypass de produto vivo: **projeto zerado**.
- Rodou tráfego de outro ambiente: **projeto zerado**.
- Regra sem taxa de FP medida: −30%.
- Sem declaração de lacunas: −20%.
- Sem o orçamento calculado: −15%.
- "Não fiz" ausente: −10%.

---

## 11.4 Roteiro

| Bloco | Duração | O que fazer |
|---|---|---|
| 1 | 25 min | Alvo e superfície |
| 2 | 30 min | A regra e a normalização |
| 3 | 30 min | O FP e o orçamento |
| 4 | 25 min | Evasão e ciclo |
| 5 | 10 min | Relatório, lacunas e conduta |

⚠ **Resista à tentação de escrever a regra e parar.** **A regra é 15% da nota; a medição, 55%.**

---

## 11.5 Critérios de aceitação

- `00-alvo.md` com o ataque, o critério e **o que não vai detectar**.
- `01-superficie.md` com o inventário **testado**, não suposto.
- Você declarou **o que aceita não ver**.
- O **teste de isolamento** feito, com resultado.
- `02-regra.md` com a regra e a **família justificada** contra as alternativas.
- A **hipótese** com critério de falsificação.
- `03-normalizacao.md` com **o número de decodificações medido**.
- Você verificou **se a forma original está logada**.
- `04-fp.md` com o **tráfego legítimo gerado** e a taxa medida.
- Você registrou **o trade-off** de cada ajuste (ΔFP × ΔFN).
- Você verificou **se a lista de exclusão cresceu**.
- `05-orcamento.md` com **a conta** e o veredito.
- `06-evasao.md` com **as sete famílias** e a resistência medida.
- Você distinguiu **as famílias testáveis por payload** das outras.
- `07-ciclo.md` com **pelo menos duas voltas** e o ganho marginal.
- Você identificou **se o ajuste foi ganho ou troca**.
- `08-relatorio.md` com as **doze** seções.
- Você escreveu **o que prova e o que não prova**.
- `09-lacunas.md` com **cada lacuna classificada**.
- Você declarou **a família sem contramedida fiável**.
- `10-declaracao.md` com **todas** as caixas.
- ⚠ **Nenhum sensor de terceiro.** Nenhuma evasão contra alvo real.

---

## Avaliação final

1. **Por que o entregável é a regra **medida**, e não a regra?
2. **Por que "aposentada com registro" é resultado válido?
3. **O que o inventário precisa provar?** Com o quê?
4. **Por que declarar a cegueira aceita?
5. **O que a família justificada exige?
6. **Por que a hipótese precisa da falsificação?
7. **O que medir na normalização?** Por que importa?
8. **Por que a forma original é pré-requisito da regra alinhada?
9. **Como se mede o FP?** O que é necessário?
10. **O que acontece se você não medir?
11. **Qual o trade-off de todo ajuste?
12. **Por que a lista de exclusão é dívida?
13. **Como se calcula o orçamento?** Em que unidade?
14. **O que fazer quando a regra está acima dele?
15. **Quantas famílias de evasão se testam por payload?
16. **Por que as outras duas não se testam assim?
17. **O que o ganho marginal diz?** Quando parar?
18. **O que significa "o ajuste foi troca"?
19. **Por que declarar a lacuna torna a regra auditável?
20. **O que a declaração de conduta precisa deixar claro** sobre a evasão?

---

## Encerramento do curso

Você começou com "o detector e o atacante olham para os mesmos bytes", e terminou com uma regra
medida: superfície, família, normalização, FP, orçamento, resistência, ciclo e lacunas.

O que você aprendeu não foi escrever regex — **e não foi evadir.** Foi **medir**, e **declarar**.

| # | O que fica |
|---|---|
| 1 | **Toda regra erra** — a pergunta é quanto custa. |
| 2 | **A precisão é o número que o analista vive**, e ela cai rápido. |
| 3 | **A assinatura envelhece; a gramática não.** |
| 4 | **A defesa que remove é o vetor.** |
| 5 | **O log nasce para depurar; a detecção quer a forma suja.** |
| 6 | **O orçamento é em minutos, e ele acaba.** |
| 7 | **Quando o problema é a camada, a solução é outra camada.** |

⚠ **E a linha deste curso, que é a mais delicada da trilha:**

> **Você escreveu evasão.** **E ela é dual-use por natureza.** **A diferença entre medir e atacar
> não está na técnica — está no destino, e na declaração.**

⚠ **E o fecho da trilha.**

| Curso | Estado |
|---|---|
| Pesquisa em Segurança | ✅ |
| Análise Diferencial de Patch | ✅ |
| Parser Differentials | ✅ |
| HTTP Smuggling e Camada | ✅ |
| Exploit Development | ✅ |
| **Detecção e Evasão** | ✅ **este** |
| Fuzzing Avançado | pendente |

**O eixo defensivo está fechado.** **O que resta é o Fuzzing Avançado** — **que usa o harness do
Parser Differentials, o espaço de variantes do HTTP Smuggling e o `1dFuzz` do Patch Diffing.**

Referências para continuar: **MITRE ATT&CK** · **Sigma** · **Suricata** · **Zeek** ·
**OWASP CRS** · **WAFFLED** · **RFC 9110 / 9112** · **"=" False Positive" (Google SRE)** ·
**Detection Engineering (práticas)** · **Purple Team**
