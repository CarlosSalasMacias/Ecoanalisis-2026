# EcoAnalytics 2026

Aplicación web para el análisis cuantitativo de comunidades vegetales a partir de datos de inventario
(árboles por parcela) y variables ambientales por parcela. Todos los cálculos estadísticos se hacen en el
navegador; la IA (Gemini) solo se usa, de forma opcional, para redactar borradores de interpretación y
metodología.

## Análisis incluidos

| Análisis | Método | Validado contra |
|---|---|---|
| Co-ocurrencia de especies | Modelo probabilístico (Veech 2013), colas hipergeométricas exactas, FDR (Benjamini–Hochberg) | `phyper`, `p.adjust` |
| Diversidad alfa | Shannon, Simpson, Pielou, Margalef, Chao1 con IC (Chao 1987), cobertura (Chao y Jost 2012) | `vegan`, `iNEXT` |
| Rarefacción y extrapolación | Números de Hill q = 0, 1, 2 con IC bootstrap (Chao et al. 2014) | `iNEXT` 3.0.2 |
| Especies indicadoras | IndVal (Dufrêne y Legendre 1997; De Cáceres y Legendre 2009), 999 permutaciones | `labdsv::indval`, `indicspecies::multipatt` |
| Ordenación | CCA (ter Braak 1986), test de permutación, VIF, elipses por grupo | `vegan::cca`, `anova.cca`, `ordiellipse` |
| Estructura | Abundancia, frecuencia, dominancia, IVI | — |
| Biomasa y carbono | Chave et al. 2005 y 2014, ecuaciones para cultivos; fracción de carbono configurable (0,47 IPCC por defecto) | tests propios |

Los procedimientos aleatorios (permutaciones, bootstrap) usan una semilla fija, así que los mismos datos
dan siempre los mismos resultados.

## Uso local

Requisitos: Node.js 22.

```bash
npm install
npm run dev
```

## Validación

```bash
npm test                 # tests numéricos (Vitest)
npm run validate:r       # regenera los valores de referencia con R (vegan, labdsv, iNEXT, indicspecies)
```

El workflow **Validación contra R** (`.github/workflows/validacion.yml`) instala los paquetes de R desde
CRAN, regenera las referencias y ejecuta los tests en cada push. El despliegue a GitHub Pages
(`deploy.yml`, rama `main`) solo se publica si los tests pasan.

## Estructura

- `services/stats/`: motor estadístico (funciones puras, sin dependencias de la interfaz).
- `services/analysisService.ts`: adapta los datos de la tabla al motor estadístico.
- `validation/generate_reference.R`: genera los valores de referencia con R.
- `tests/`: comparación numérica con R y pruebas de consistencia.
