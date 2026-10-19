# YoRHa Garden

Landing page for **yorhagarden.xyz**, the development and staging VPS for
[al.is-a.dev](https://al.is-a.dev). It is a single static page with a NieR-style boot sequence.

## Tech stack

- Plain HTML, CSS and vanilla JavaScript in one file: [public/index.html](public/index.html)
- Self-hosted Acorn font ([public/fonts/acorn.woff](public/fonts/acorn.woff)); Poppins and
  Noto Sans JP from Google Fonts
- No build step, no dependencies

## Setup & run

Serve the `public/` folder with any static file server, for example:

```bash
python3 -m http.server 8080 --directory public
```

Then open <http://localhost:8080>.

## Environment variables

None. The page is fully static.

## Deployment

The contents of `public/` are served as the web root of yorhagarden.xyz.
<!-- TODO: document the actual web server / tunnel setup. -->

## Contributing

Follow the repository SOP in [docs/github-repository-guideline.md](docs/github-repository-guideline.md).
Agent-facing instructions are in [AGENTS.md](AGENTS.md).
