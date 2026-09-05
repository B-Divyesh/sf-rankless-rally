# Demo sandbox

Open `https://rankless-rally.sociobot.in/demo` or use the first-screen **Try it with sample data** button.

The demo opens Practice 01 with a sample rally card. It stores only these keys:

- `demo:rankless-rally:settings`
- `demo:rankless-rally:run`
- `demo:rankless-rally:bests`

The real game uses the same names without the `demo:` prefix. The persistent demo banner says **Demo — sample data, nothing is saved to your real game**, offers **Reset demo**, and offers **Start for real**. Reset removes only the three demo keys; Start for real removes the demo keys and opens `/`.

The claims suite enters `/demo` from fresh browser contexts. Its isolation check begins a real run, resets the demo, and verifies the real run remains available.
