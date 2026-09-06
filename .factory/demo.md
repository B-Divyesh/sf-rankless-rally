# Demo sandbox

Open `https://rankless-rally.sociobot.in/demo` or use the first-screen **Try it with sample data** button.

The demo opens Practice 01 with a sample rally card and a visible shared-route marker. The product server verifies the seeded route and stores its board ID, moves, opaque code, `demo` tenant, creation time, and 24-hour expiry in its isolated SQLite namespace. Demo and public replay records cannot read each other. It is not read from real-game storage. Browser storage uses only these keys:

- `demo:rankless-rally:settings`
- `demo:rankless-rally:run`
- `demo:rankless-rally:bests`
- `demo:rankless-rally:completed-replay-code`

The real game uses the same names without the `demo:` prefix. The persistent demo banner says **Demo — sample data, nothing is saved to your real game**, offers **Reset demo**, and offers **Start for real**. Reset removes only the four demo keys; Start for real removes the demo keys and opens `/`.

The claims suite enters `/demo` from fresh browser contexts. Its isolation check begins a real run, enters through the first-screen sample action, resets the demo, and verifies the real run remains available.
