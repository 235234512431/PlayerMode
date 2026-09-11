# PlayerMode 0.6.3 status

Date: 2026-09-11. Added history ordering and last-conversation timestamps.

The existing `tests.mjs` suite was run once early in this iteration and passed. The user then explicitly requested no further tests and direct publishing. No targeted sorting/date tests, browser inspection, new static audit or DESIGN.md lint were performed for this release. Earlier release evidence below does not validate the added ordering/time behavior. Remote file readback is delivery verification only. No installed SillyTavern files, real chats or model settings were changed.

# PlayerMode 0.6.2 verification

Date: 2026-09-11. Added local history name/preview filtering and shared IME-safe search controls.

- `node tests.mjs` passed, including added preview/title matching, case folding, unfinished IME composition, no-results, clear/page reset and the existing stale-response regression.
- `node navigation-tests.mjs` passed all 16 cases.
- Isolated mock-host browser: role history loads, preview text finds the expected row, an unmatched query displays recovery copy, clearing restores rows and input focus. Desktop and 390×600 layouts checked; existing Fugou theme remains consistent with the shelf.
- Frontend Design Premium strict audit and DESIGN.md lint: zero errors or warnings.
- This release does not add remote keyword queries or change native chat operations. Failure/empty/loading behavior remains the existing flow; real native account isolation, model/worldbook flows and physical IME/soft-keyboard behavior were not newly verified. The IME regression uses simulated composition events in unit tests.

# PlayerMode 0.6.1 verification

Date: 2026-09-11. Target native source examined read-only: SillyTavern 1.18.0. Checks use the standalone extension and an isolated mock host; the installed SillyTavern was not started or modified.

## Passed for this repair

- `node tests.mjs`: existing password, settings, role/navigation, theme preferences and list-race suites.
- `node navigation-tests.mjs`: 16 cases covering awaited native confirmation, cancellation, nondeleting creation, duplicate guards, generation during confirmation, role/session changes, group handling, save before switching, reordered character indices, changed chat during save, opened file verification, no-op creation, failure recovery, invalid file names and sparse/null data.
- Browser reproduction of the reported theme bug: in 0.6.0, the theme cards and reading controls pushed action buttons below the viewport. The repaired dialog scrolls its central content while retaining its header and action footer.
- Desktop 1280×720 and narrow 390×600 browser views inspected. At 390×600 the action footer remained within the viewport (top 514px, bottom 587px), including after theme preview and setting 22px body text / 2.2 line height.
- Cancel restored the previous theme and focus; the top-right dismiss button also restored the saved theme and focused the theme trigger. Applying the Fugou theme and reading preferences survived opening the page again.
- Mock-host new conversation selected the configured default role. Cancel retained the story shelf; confirmation opened the new chat and focused the native composer.
- Frontend Design Premium strict static audit and DESIGN.md lint completed with zero errors or warnings.
- Independent read-only review of cancellation, duplicate action protection and error handling found no release-blocking issue.

## Scope limits

The browser fixture mocks native Popup and doNewChat contracts read from SillyTavern 1.18.0. It does not prove real server chat persistence, model sending/streaming/stopping, worldbook triggers, account isolation, third-party theme compatibility or physical mobile keyboards. Native save functions can internally handle failures; this release does not claim transactional save confirmation. Earlier password and theme unit coverage was rerun, but the full 0.4.0 browser matrix was not repeated. No real user data, model credentials or password was used in the fixture or published.

# PlayerMode 0.6.0 status (historical)

User explicitly requested direct publishing without verification. No tests, browser preview or static design audit were run for 0.6.0. School-specific world lore was not supplied; the dedicated interface is a provisional classroom-at-dusk visual. Prior evidence below applies to previous versions only.

# Final 0.5.0 status

At the user’s explicit request, the final three-theme and reading-control changes were uploaded without validation. Earlier isolated tests applied to the two-theme implementation before reading controls. No browser visual QA, final regression run or 0.5.0 static audit was completed. Historical evidence below does not establish final-release verification.

# PlayerMode 0.5.0 verification

Existing isolated tests and added theme tests passed: preview/cancel, saved preference, account separation, unknown values, storage unavailable. User requested stopping further verification. Browser visual QA and 0.5.0 design audits were not completed. The previous release evidence below applies to 0.4.0 only.

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
