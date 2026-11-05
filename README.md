# 📊 Simulateur BVMAC — Réinvestissement des dividendes

[![Déploiement GitHub Pages](https://github.com/ESSANANOMO/SIMULATEURBVMAC/actions/workflows/pages.yml/badge.svg)](https://github.com/ESSANANOMO/SIMULATEURBVMAC/actions/workflows/pages.yml)
[![Licence MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Simulateur pédagogique de backtesting comparant une stratégie de conservation des dividendes en espèces avec une stratégie de réinvestissement automatique (DRIP) sur un portefeuille d’actions BVMAC. Les cours simulés sont des hypothèses et non des données officielles en direct.

## 🎯 Objectif pédagogique

Développé dans le cadre du mémoire de **Master 2 en Finance & Ingénierie Financière** de FRANC THIERRY ESSANA NOMO. Le simulateur illustre l’effet du réinvestissement, de la fiscalité et des frais sur un portefeuille hypothétique.

## ✨ Fonctionnalités

| Fonctionnalité | Description |
| --- | --- |
| 🔁 DRIP | Comparaison des dividendes conservés en cash et réinvestis |
| 🧾 IRCM | Taux paramétrable, 16,5 % par défaut |
| 💼 Frais SGI | Taux paramétrable, 1,5 % par défaut |
| 📅 Backtesting | Modèle annuel 2015–2025 |
| 📈 Graphiques | Visualisation interactive avec Chart.js |
| 📊 Indicateurs | CAGR, Sharpe, Sortino et drawdown maximum |
| 💾 Paramètres | Sauvegarde locale, configuration JSON et partage par URL |
| 📱 Interface | Mode sombre et présentation mobile |

## 🚀 Installation locale

Le site est statique : aucune installation de dépendances ni compilation n’est nécessaire.

```bash
git clone https://github.com/ESSANANOMO/SIMULATEURBVMAC.git
cd SIMULATEURBVMAC
python3 -m http.server 8000
```

Ouvrez ensuite <http://localhost:8000/>. Le service worker nécessite localhost ou HTTPS.

## 🌐 Démo en ligne

[Ouvrir le simulateur sur GitHub Pages](https://ESSANANOMO.github.io/SIMULATEURBVMAC/) — à activer dans **Settings → Pages** si le site n’est pas encore publié.

## 🛠️ Stack technique

- HTML5, CSS3 et JavaScript natif
- Tailwind CSS via CDN
- Chart.js
- Font Awesome
- GitHub Actions et GitHub Pages

## 📊 Captures d’écran

Ajoutez vos captures au dossier `screenshots/`, puis mettez à jour ces chemins :

| Simulateur | Résultats |
| --- | --- |
| ![Vue principale](screenshots/simulateur.png) | ![Résultats](screenshots/resultats.png) |

## 👨‍💻 Auteur

**FRANC THIERRY ESSANA NOMO** — Mémoire de Master 2, Finance & Ingénierie Financière.

## 📄 Licence

Licence MIT — consultez [`LICENSE`](LICENSE).

> Outil pédagogique uniquement. Les résultats simulés ne constituent ni une recommandation ni un conseil financier.
