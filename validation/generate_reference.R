# Genera los valores de referencia con los que se validan los cálculos de EcoAnalytics.
#
# Uso (desde la raíz del repositorio):
#   Rscript validation/generate_reference.R
#
# Paquetes: vegan, jsonlite (obligatorios); labdsv, iNEXT, indicspecies (opcionales: si faltan,
# se omite su bloque y los tests correspondientes se saltan). El workflow de GitHub Actions
# "Validación contra R" instala todos los paquetes y ejecuta la validación completa.

suppressPackageStartupMessages({
  library(vegan)
  library(jsonlite)
})

out_dir <- file.path("validation", "fixtures")
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)
write_fixture <- function(x, name) {
  write(toJSON(x, digits = NA, auto_unbox = TRUE, matrix = "rowmajor", null = "null"),
        file.path(out_dir, paste0(name, ".json")))
  cat("  escrito:", name, "\n")
}
has <- function(pkg) requireNamespace(pkg, quietly = TRUE)
versions <- list(R = R.version.string, vegan = as.character(packageVersion("vegan")))

data(dune, dune.env, varespec, varechem, BCI)

# ---------------------------------------------------------------- CCA ----
cca_case <- function(Y, X, groups = NULL) {
  m <- cca(Y ~ ., data = X)
  ax <- seq_along(m$CCA$eig)
  sc <- scores(m, choices = ax, display = c("species", "sites", "lc", "bp"), scaling = 2)
  set.seed(1)
  av <- anova(m, permutations = how(nperm = 999))
  res <- list(
    Y = unname(as.matrix(Y)), X = unname(as.matrix(X)),
    siteNames = rownames(Y), speciesNames = colnames(Y), envNames = colnames(X),
    totalInertia = m$tot.chi, constrainedInertia = m$CCA$tot.chi,
    eigenvalues = unname(m$CCA$eig), residualEigenvalues = unname(m$CA$eig),
    species = unname(sc$species), sitesWA = unname(sc$sites), sitesLC = unname(sc$constraints),
    biplot = unname(sc$biplot), vif = as.list(vif.cca(m)),
    F = av$F[1], df = av$Df[1], dfResidual = av$Df[2], p = av$`Pr(>F)`[1]
  )
  if (!is.null(groups)) {
    pdf(NULL)
    plot(m, scaling = 2, type = "n")
    el <- ordiellipse(m, groups, display = "sites", kind = "sd", conf = 0.95, scaling = 2, draw = "none")
    dev.off()
    res$groups <- as.character(groups)
    res$ellipses <- lapply(names(el), function(g) {
      e <- el[[g]]
      ev <- eigen(e$cov * e$scale^2)
      list(group = g, cx = unname(e$center[1]), cy = unname(e$center[2]),
           rx = sqrt(ev$values[1]), ry = sqrt(ev$values[2]))
    })
  }
  res
}

cat("CCA...\n")
dune_X <- data.frame(A1 = dune.env$A1, Moisture = as.numeric(as.character(dune.env$Moisture)))
write_fixture(list(
  dune = cca_case(dune, dune_X, dune.env$Management),
  varespec = cca_case(varespec, varechem[, c("Al", "P", "K", "N", "Baresoil")])
), "cca")

# ---------------------------------------------------------- Diversidad ----
cat("Diversidad...\n")
# Datos de arañas del paquete iNEXT (Sackett et al. 2011), incluidos aquí para no depender del paquete.
spider <- list(
  Girdled = c(46, 22, 17, 15, 15, 9, 8, 6, 6, 4, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1),
  Logged = c(88, 22, 16, 15, 13, 10, 8, 8, 7, 7, 7, 5, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1),
  BCI_plot1 = unname(as.numeric(BCI[1, BCI[1, ] > 0]))
)
sizes <- lapply(spider, function(x) {
  n <- sum(x)
  sort(unique(c(1, 5, 10, floor(n / 4), floor(n / 2), n - 1, n, n + 1, floor(1.5 * n), 2 * n)))
})
chao1_manual <- function(x) {
  n <- sum(x); S <- sum(x > 0); f1 <- sum(x == 1); f2 <- sum(x == 2)
  S + ifelse(f2 > 0, (n - 1) / n * f1^2 / (2 * f2), (n - 1) / n * f1 * (f1 - 1) / 2)
}
div <- lapply(names(spider), function(nm) {
  x <- spider[[nm]]
  m <- sizes[[nm]]
  r <- list(
    name = nm, counts = x, sizes = m,
    shannon = diversity(x, "shannon"), simpson = 1 - diversity(x, "simpson"),
    rarefyQ0 = sapply(m[m <= sum(x)], function(k) rarefy(x, k)),
    chao1Manual = chao1_manual(x)
  )
  if (has("iNEXT")) {
    out <- iNEXT::iNEXT(x, q = c(0, 1, 2), datatype = "abundance", size = m, nboot = 200)
    est <- out$iNextEst$size_based
    r$inext <- lapply(c(0, 1, 2), function(q) {
      e <- est[est$Order.q == q, ]
      list(q = q, m = e$m, qD = e$qD, lcl = e$qD.LCL, ucl = e$qD.UCL, SC = e$SC)
    })
    cr <- iNEXT::ChaoRichness(x)
    r$chaoRichness <- list(estimate = cr$Estimator, se = cr$Est_s.e., lcl = cr$`95% Lower`, ucl = cr$`95% Upper`)
    r$shannonEstimate <- iNEXT::ChaoShannon(x, transform = FALSE)$Estimator
    r$simpsonEstimate <- iNEXT::ChaoSimpson(x, transform = TRUE)$Estimator
  }
  r
})
names(div) <- names(spider)
if (has("iNEXT")) versions$iNEXT <- as.character(packageVersion("iNEXT"))
write_fixture(div, "diversity")

# ------------------------------------------------------- Co-ocurrencia ----
cat("Co-ocurrencia...\n")
pa <- (as.matrix(dune) > 0) * 1
N <- nrow(pa)
sp <- colnames(pa)
pairs <- list()
for (i in 1:(length(sp) - 1)) for (j in (i + 1):length(sp)) {
  n1 <- sum(pa[, i]); n2 <- sum(pa[, j]); obs <- sum(pa[, i] * pa[, j])
  pairs[[length(pairs) + 1]] <- list(
    speciesA = sp[i], speciesB = sp[j], obs = obs, exp = n1 * n2 / N,
    pLower = phyper(obs, n1, N - n1, n2), pUpper = phyper(obs - 1, n1, N - n1, n2, lower.tail = FALSE)
  )
}
tested <- which(sapply(pairs, function(p) p$exp >= 1))
dirp <- sapply(pairs[tested], function(p) if (p$obs >= p$exp) p$pUpper else p$pLower)
padj <- p.adjust(dirp, "BH")
for (k in seq_along(tested)) pairs[[tested[k]]]$pAdj <- padj[k]
write_fixture(list(presence = unname(pa), plots = rownames(pa), species = sp, pairs = pairs), "cooccurrence")

# ------------------------------------------------------------- IndVal ----
cat("IndVal...\n")
grp <- as.character(dune.env$Management)
iv <- list(abundance = unname(as.matrix(dune)), species = colnames(dune), groups = grp)
if (has("labdsv")) {
  set.seed(1)
  li <- labdsv::indval(dune, as.numeric(factor(grp)), numitr = 999)
  iv$labdsv <- list(groupOrder = levels(factor(grp)), indval = unname(as.matrix(li$indval)),
                    maxcls = unname(li$maxcls), indcls = unname(li$indcls), pval = unname(li$pval))
  versions$labdsv <- as.character(packageVersion("labdsv"))
}
if (has("indicspecies")) {
  set.seed(1)
  mp <- indicspecies::multipatt(dune, grp, func = "IndVal.g", duleg = TRUE, control = how(nperm = 999))
  s <- mp$sign
  iv$indicspecies <- list(groupOrder = colnames(mp$comb), stat = unname(s$stat), p = unname(s$p.value),
                          index = unname(s$index), A = unname(mp$A), B = unname(mp$B))
  versions$indicspecies <- as.character(packageVersion("indicspecies"))
}
write_fixture(iv, "indval")

write_fixture(versions, "versions")
cat("Listo.\n")
