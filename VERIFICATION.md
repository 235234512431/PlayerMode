# PlayerMode 0.4.0 verification

Date: 2026-09-11. Target native source examined read-only: SillyTavern 1.18.0.

## Passed

- `node tests.mjs`: shared password setup/readback, incorrect password, latest-server password, offline/read failure, save failure/retry, no old browser state trust, temporary unlock/reload, password change gate, keyboard/cancel.
- Navigation tests: allowed-role filtering, explicit target before native new-chat, native selection refusal cannot create assistant chat, generation/duplicate guards, open native history without adding a file suffix, per-session history request, expired session and malformed/offline responses.
- List race regression: a late response for role A cannot replace role B's records, including when loading more.
- Isolated mock-host browser: shelf → role history → native chat → shelf; configured default selected by shelf new-chat; native confirmation mock cancelled without clearing messages; wrong/correct exit password; original fixture UI restored after exit; role config saved with server readback; reload locks again.
- Separate origins (`127.0.0.1` and `localhost`) read the same fixture account's saved configuration, without browser-local setup. These are separate storage environments, not two actual SillyTavern users.
- Desktop and 390×844 browser viewport inspected: shelf, missing-cover fallback, long messages, horizontal code block scrolling, composer, password error modal. Draft guard retains input. Shelf heading focus and composer focus after navigation checked. Account switch confirmation opens and Escape cancels.
- Frontend Design Premium strict static audit: zero errors, warnings or findings.
- DESIGN.md lint: zero errors or warnings (token-summary informational output only).

## Not validated against a running SillyTavern

- Two actual native accounts logging in/out and seeing isolated history; native logout completion and admin account creation.
- Real model sending, streaming, stopping; actual worldbook triggers and preset effects.
- Actual native chat-save success, creation confirmation/acceptance, real imported card portraits and chat images.
- Physical mobile soft keyboard, third-party themes/extensions, other SillyTavern versions.

The fixture reproduces API contracts to exercise extension behavior; it does not prove these native end-to-end scenarios. The user will enable/provision accounts and install/update manually. No host configuration, installation, character, worldbook, model setting or real chat was modified. No SillyTavern server or real model was started.
