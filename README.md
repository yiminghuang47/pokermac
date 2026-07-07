# pokermac

A Zetamac-style poker **outs-counting** trainer. See [RULES.md](RULES.md) for the full spec.

## Run

It's a static site with no build step, but the JS uses ES modules, so it must be
served over HTTP (opening `index.html` via `file://` won't load the modules). From
the repo root:

```
python -m http.server 8000     # or: npx serve
```

then open http://localhost:8000.

## Structure

```
index.html      markup only — links styles.css and src/main.js
styles.css      all styling
src/
  deck.js       ranks, suits, preflop range, deck build/shuffle
  evaluator.js  5-card hand eval + best-5-of-N
  rules.js      hero/villain qualification + low-end-gutshot exclusion
  generate.js   spot generation + outs-distribution skew
  main.js       rendering, game loop, DOM wiring (entry point)
```
