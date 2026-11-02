# DesignerTube web

The Next.js 16 site behind [designertube.app](https://designertube.app). See the [project README](../README.md) for how the dataset was built, configuration and deployment.

```bash
pnpm install
pnpm dev     # http://localhost:3000
pnpm build
```

The site reads the generated dataset in `data/` (produced by `../pipeline/05_export.py`); there is no database.
