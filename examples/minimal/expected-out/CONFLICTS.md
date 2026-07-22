# Conflicts — where the sources disagree

6 unresolved · 0 resolved · 0 stale. A conflict means two claims cannot both be true; both facts are marked DISPUTED until an expert adjudicates.

## c-yhx8j4 _[extraction]_

- **A** (Maria) `f-1miofd8`: Extraction time for a balanced double espresso is 25 to 30 seconds, measured from the first drop
- **B** (Maria, Jonas) `f-uftebe`: Shot time window for balanced double espresso: 25–30 seconds (Maria) vs. 32–38 seconds (Jonas)
- Why they clash: They give incompatible time windows for the same parameter: 25-30 seconds versus 32-38 seconds for balanced double espresso.
- Adjudication (coming in v0.2 — see ROADMAP.md):
  - accept A: `veritas review <config> --resolve c-yhx8j4 --winner f-1miofd8 --by "your name"`
  - accept B: `veritas review <config> --resolve c-yhx8j4 --winner f-uftebe --by "your name"`

## c-9smsy9 _[machine]_

- **A** (Jonas) `f-1wedl8n`: For medium roasts, set the machine to 93–94 degrees Celsius; below 93°C underextraction occurs and the cup tastes hollow
- **B** (Maria) `f-ypz1m2`: For medium roasts, brew temperature should be 92 degrees Celsius
- Why they clash: They specify different brew temperatures for medium roasts: 93-94°C versus 92°C.
- Adjudication (coming in v0.2 — see ROADMAP.md):
  - accept A: `veritas review <config> --resolve c-9smsy9 --winner f-1wedl8n --by "your name"`
  - accept B: `veritas review <config> --resolve c-9smsy9 --winner f-ypz1m2 --by "your name"`

## c-19z32qu _[extraction]_

- **A** (Maria) `f-1miofd8`: Extraction time for a balanced double espresso is 25 to 30 seconds, measured from the first drop
- **B** (Jonas) `f-1wpbp7h`: Doubles should run long: over 30 seconds, usually 32 to 38 seconds
- Why they clash: Both specify extraction time ranges for double espresso but give incompatible durations (32-38 seconds vs 25-30 seconds).
- Adjudication (coming in v0.2 — see ROADMAP.md):
  - accept A: `veritas review <config> --resolve c-19z32qu --winner f-1miofd8 --by "your name"`
  - accept B: `veritas review <config> --resolve c-19z32qu --winner f-1wpbp7h --by "your name"`

## c-1yxlw33 _[extraction]_

- **A** (Jonas) `f-1wpbp7h`: Doubles should run long: over 30 seconds, usually 32 to 38 seconds
- **B** (Maria, Jonas) `f-uftebe`: Shot time window for balanced double espresso: 25–30 seconds (Maria) vs. 32–38 seconds (Jonas)
- Why they clash: Maria recommends 25–30 seconds while Jonas recommends 32–38 seconds for the same double espresso shot time.
- Adjudication (coming in v0.2 — see ROADMAP.md):
  - accept A: `veritas review <config> --resolve c-1yxlw33 --winner f-1wpbp7h --by "your name"`
  - accept B: `veritas review <config> --resolve c-1yxlw33 --winner f-uftebe --by "your name"`

## c-1ruqi0y _[beans]_

- **A** (Maria) `f-p8pa5x`: Standard double espresso dose is 18 grams of coffee
- **B** (Jonas) `f-y5u62r`: Use a 20 gram dose for double espresso, as modern precision baskets are built for it and the bigger bed forgives small distribution errors
- Why they clash: One claims 18 grams is standard while the other recommends 20 grams for double espresso dose.
- Adjudication (coming in v0.2 — see ROADMAP.md):
  - accept A: `veritas review <config> --resolve c-1ruqi0y --winner f-p8pa5x --by "your name"`
  - accept B: `veritas review <config> --resolve c-1ruqi0y --winner f-y5u62r --by "your name"`

## c-1rosry2 _[extraction]_

- **A** (Maria) `f-twplkx`: For a double espresso, 18 grams in should give about 36 grams out at 1:2 ratio
- **B** (Jonas) `f-y5u62r`: Use a 20 gram dose for double espresso, as modern precision baskets are built for it and the bigger bed forgives small distribution errors
- Why they clash: One specifies 18 grams input while the other recommends 20 grams for double espresso dose.
- Adjudication (coming in v0.2 — see ROADMAP.md):
  - accept A: `veritas review <config> --resolve c-1rosry2 --winner f-twplkx --by "your name"`
  - accept B: `veritas review <config> --resolve c-1rosry2 --winner f-y5u62r --by "your name"`
