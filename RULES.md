# Pokermac — Outs Trainer Rules

The spec for the outs-counting drill, as decided so far. (App entry point: `index.html`.)

## The spot
- **Hero and villain are both shown face up** on the **turn** (a 4-card board + a dashed "river" slot).
- Hero must count **outs**: the unseen river cards that make **hero's hand win** by the river.
- Hero is always **currently behind** on the turn (otherwise "count your outs" is meaningless). Spots where hero is ahead are never generated.

## What counts as an out
- An out is a river card that gives hero a **strictly winning** hand.
- A card that produces a **tie does NOT count**.
- **Hero always has at least 4 outs** — thin (0–3 out) spots are never generated.
- **Pure low-end-gutshot spots are excluded.** If hero's only real draw is a gutshot to the *bottom* ("idiot") end of the straight — hero doesn't hold the top card of the completed straight — the spot is dropped. Pair outs (overcards) do **not** rescue it; a flush draw, an open-ended draw, or a high/nut-end gutshot does. ("Low end" = hero doesn't hold the top card of the straight it's drawing to.)
- Outs are computed exactly with a real best-5-of-7 evaluator (accounts for the card *also* helping villain — e.g. a flush card that pairs the board and gives villain a full house is not an out).

## Answer input
- **No Enter key.** Just type the number; it auto-advances the instant the typed value equals the correct count (Zetamac-style).
- **No skip / no way out** — you stay on a spot until you type the right number (pure Zetamac model).
- Fixed timer (60 / 120 / 180s), score = number answered correctly, end screen shows the final **score**.

## Which hands get dealt
- Both hero and villain hole cards are drawn **only from the top ~40% preflop range** (530/1326 combos — the standard range chart). No random trash like 72o.
- **Hero** must have, on the turn, **at least a pair OR a real draw**:
  - "At least a pair" = pair-or-better that **uses a hole card** (pocket pair, or a hole card that pairs the board). A pure board pair that neither player's hole cards touch does not qualify.
  - "A draw" = a **flush draw or straight draw** (open-ended or gutshot) that **uses a hole card**.
  - **A "pair draw" (overcards only) does NOT count** as a draw.
- **Villain** must have **at least top pair, meaningfully** (a stronger requirement than hero):
  - Qualifies with **top pair or an overpair** (a hole card pairing/beating the highest board card), a **set**, a **genuine two pair** (both hole cards pair two different board cards), or a **straight-or-better**.
  - **Does NOT qualify** with a draw, second/bottom pair, an underpair, or a fake "two pair" that only exists because the **board is paired** (e.g. hole `33` on `K T 7 7` borrows the board's 7s — rejected). The pair/holding must come from villain's own cards, not be inherited from the board.

## Settings
- **Time:** 60 / 120 / 180 seconds (the only user-facing setting).

## Outs distribution
- The generator **leans toward bigger draws.** Via acceptance sampling on top of the normal generator (poker constraints above are never violated), each out-count is weighted **∝ its size over 4–14**, so flush draws / open-enders / combo draws dominate and thin 4-out spots are rarer. Mean ≈ 10 outs. This is fixed — there's no distribution selector.

## Presentation
- **4-color deck:** spades = black, hearts = red, diamonds = blue, clubs = green.
- Cards show the **rank in the top-left corner** and a **single large suit pip** in the center (suit not repeated).
