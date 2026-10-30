# EcoAnalytics 2026

Aplicación web para el análisis cuantitativo de comunidades vegetales a partir de datos de inventario
(árboles por parcela) y variables ambientales por parcela. Todos los cálculos estadísticos se hacen en el
navegador. La sección de metodología se genera sin IA; la IA (Gemini) solo se usa, de forma opcional,
para redactar un borrador de la interpretación, que se revisa automáticamente.

## Análisis incluidos

| Análisis | Método | Validado contra |
|---|---|---|
| Co-ocurrencia de especies | Modelo probabilístico (Veech 2013), colas hipergeométricas exactas, FDR (Benjamini–Hochberg) | `phyper`, `p.adjust` |
| Diversidad alfa | Shannon, Simpson, Pielou, Margalef, Chao1 con IC (Chao 1987), cobertura (Chao y Jost 2012) | `vegan`, `iNEXT` |
| Rarefacción y extrapolación | Números de Hill q = 0, 1, 2 con IC bootstrap (Chao et al. 2014) | `iNEXT` 3.0.2 |
| Especies indicadoras | IndVal (Dufrêne y Legendre 1997; De Cáceres y Legendre 2009), 999 permutaciones | `labdsv::indval`, `indicspecies::multipatt` |
| Ordenación | CCA (ter Braak 1986), test de permutación, VIF, elipses por grupo | `vegan::cca`, `anova.cca`, `ordiellipse` |
| Estructura | Abundancia, frecuencia, dominancia, IVI | — |
| Biomasa y carbono | Chave et al. 2005 y 2014, ecuaciones para café, cacao y banano; fracción de carbono configurable (0,47 IPCC por defecto) | coeficientes comprobados en los PDF originales (ver abajo) |

Los procedimientos aleatorios (permutaciones, bootstrap) usan una semilla fija, así que los mismos datos
dan siempre los mismos resultados.

## Redacción y bibliografía

- **Metodología** (`services/report/methods.ts`): se genera sin IA a partir de los parámetros reales del
  análisis (semilla, permutaciones, réplicas bootstrap, ecuaciones alométricas usadas, fracción de carbono).
- **Bibliografía fija** (`services/references.ts`): es la única fuente de citas. Los DOI se comprueban contra
  Crossref en cada push (`tests/references.crossref.test.ts`); las obras sin DOI están marcadas para revisión manual.
- **Interpretación con IA** (`services/report/aiReport.ts`): la IA recibe solo el resumen de resultados
  calculados y solo puede citar claves de la bibliografía fija. No puede comparar con otros estudios:
  deja marcas `[COMPARAR: …]` para que los autores lo hagan con fuentes leídas. Al recibir el texto, la
  aplicación sustituye las claves por citas, añade la lista de referencias y señala las cifras que no salen
  de los resultados, las claves inexistentes y las citas autor-año escritas por la IA.

## Ecuaciones alométricas

| Ecuación | Fuente | Diámetro | Estado |
|---|---|---|---|
| Pantropical con altura | Chave et al. 2014, ec. 4 | DAP | Comprobada en el PDF original |
| Bosque seco, húmedo, muy húmedo (con y sin altura) | Chave et al. 2005 | DAP | Comprobadas en Hairiah et al. 2011, Tabla 2 |
| Café (d15; d15 + altura) | Segura et al. 2006, Tabla 3, ec. 3 y 4 | d15 | Comprobadas en el PDF original |
| Cacao | Yuliasmara 2008, en Hairiah et al. 2011, Tabla 3 | DAP | Comprobada en la compilación (fuente secundaria) |
| Banano (*Musa* sp.) | Arifin 2001, en Hairiah et al. 2011, Tabla 3 | DAP | Comprobada en la compilación (fuente secundaria) |
| Cacao d30 (atribuida a Fomekong et al. 2024) | — | d30 | **Sin verificar** |
| *Citrus sinensis* (atribuida a Schroth et al. 2002) | — | DAP | **Sin verificar** |

La aplicación avisa cuando se usa una ecuación sin verificar, cuando la ecuación exige un diámetro distinto
del DAP y cuando un individuo queda fuera del rango de calibración publicado.

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
