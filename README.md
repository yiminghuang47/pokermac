# pokermac

A Zetamac-style poker **outs-counting** trainer. See [RULES.md](RULES.md) for the full spec.

**▶ Play it live: https://yiminghuang47.github.io/pokermac/**

Play solo, or hit **Challenge friends** to spin up a realtime room — friends join
by link, everyone readies up, and you all race the same spots at once.

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
  rng.js        seeded PRNG (shared seed → identical spots for a room)
  room.js       realtime challenge rooms (Supabase presence + broadcast)
  config.js     Supabase project URL + anon key
  main.js       rendering, game loop, solo + multiplayer wiring (entry point)
```
