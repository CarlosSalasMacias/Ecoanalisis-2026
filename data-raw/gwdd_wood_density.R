# Medias de densidad básica de la madera a partir de la Global Wood Density Database v2.2.
#
# Fuente: Fischer, F. J., Chave, J., Zanne, A., et al. (2026). Beyond species means – the
# intraspecific contribution to global wood density variation. New Phytologist, 249, 2630–2651.
# https://doi.org/10.1111/nph.70860. Datos: https://doi.org/10.5281/zenodo.20815517
#
# Uso: Rscript data-raw/gwdd_wood_density.R ruta/a/gwdd_v2.2.RData
# Salida: public/data/gwdd-v2.2-wood-density.json
#
# Filtros (los de Fischer et al. 2026, sección II.1): se excluyen los registros identificados solo a
# género, las muestras con corteza, las de raíz, las de experimentos (fertilizer/treatment) y las de
# plantaciones. Las variedades y subespecies se agregan a su especie (género + epíteto).
#
# Medias (como BIOMASS::getWoodDensity): especie = media de sus registros; género y familia = media
# de las medias de sus especies. Se calculan para todo el mundo y para cada región de la GWDD.

suppressPackageStartupMessages(library(jsonlite))
args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 1) stop("Indique la ruta del archivo gwdd_v2.2.RData")

env <- new.env()
suppressWarnings(load(args[1], envir = env))
d <- as.data.frame(get("gwdd_v2.2", envir = env))
n_total <- nrow(d)

keep <- d$rank_taxonomic != "genus" &
  !grepl("bark", d$type_tissue, ignore.case = TRUE) &
  !grepl("root", d$location_sample, ignore.case = TRUE) &
  !grepl("fertilizer|treatment", d$experiment_design, ignore.case = TRUE) &
  !(d$type_forest %in% "plantation") &
  !is.na(d$wsg) & d$genus != "" & d$epithet != ""
d <- d[keep, ]
d$key <- tolower(paste(d$genus, d$epithet))
d$genus_key <- tolower(d$genus)
d$family[is.na(d$family)] <- ""

r3 <- function(x) round(x, 3)

summarise <- function(x) {
  if (nrow(x) == 0) return(NULL)
  sp <- aggregate(wsg ~ key + genus_key + family, data = x, FUN = function(v) c(mean = mean(v), n = length(v)))
  sp <- data.frame(key = sp$key, genus = sp$genus_key, family = sp$family,
                   mean = sp$wsg[, "mean"], n = sp$wsg[, "n"])
  sp <- sp[!duplicated(sp$key), ]
  level <- function(by) {
    g <- split(sp$mean, sp[[by]])
    g <- g[names(g) != ""]
    lapply(g, function(m) c(r3(mean(m)), length(m), if (length(m) > 1) r3(sd(m)) else NA))
  }
  list(
    sp = setNames(lapply(seq_len(nrow(sp)), function(i) c(r3(sp$mean[i]), sp$n[i])), sp$key),
    ge = level("genus"),
    fa = level("family")
  )
}

regions <- sort(unique(d$region[d$region != ""]))
gf <- unique(d[d$family != "", c("genus_key", "family")])
gf <- gf[!duplicated(gf$genus_key), ]

out <- list(
  meta = list(
    database = "Global Wood Density Database v2.2",
    citation = "Fischer et al. (2026) New Phytologist 249: 2630-2651, doi:10.1111/nph.70860",
    data_doi = "10.5281/zenodo.20815517",
    records_total = n_total,
    records_used = nrow(d),
    species = length(unique(d$key)),
    filters = "Excluded: genus-level records, bark, root, experiments (fertilizer/treatment), plantations",
    units = "basic wood density (g cm-3)",
    columns = list(sp = c("mean", "n_records"), ge = c("mean_of_species_means", "n_species", "sd_among_species"),
                   fa = c("mean_of_species_means", "n_species", "sd_among_species"))
  ),
  intraspecificSD = 0.068,
  regions = regions,
  genusFamily = setNames(as.list(gf$family), gf$genus_key),
  global = summarise(d),
  byRegion = setNames(lapply(regions, function(r) summarise(d[d$region == r, ])), regions)
)

dir.create("public/data", showWarnings = FALSE, recursive = TRUE)
write(toJSON(out, auto_unbox = TRUE, digits = NA, na = "null"), "public/data/gwdd-v2.2-wood-density.json")
cat("Registros usados:", nrow(d), "de", n_total, "; especies:", length(unique(d$key)), "\n")
