---
version: alpha
colors:
  background: '#111724'
  surface: '#1B2434'
  border: '#344158'
  text: '#E9EDF5'
  muted: '#AAB6CB'
  primary: '#B6A7EA'
  error: '#ffb5b5'
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: 16px
    lineHeight: '1.85'
  title:
    fontFamily: "'Songti SC', STSong, 'Noto Serif CJK SC', serif"
    fontSize: 24px
    lineHeight: '1.4'
rounded:
  surface: 16px
  button: 10px
  dialog: 20px
spacing:
  compact: 8px
  field: 16px
  reading: 28px
components:
  button:
    height: 40px
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  divider:
    height: 1px
    backgroundColor: "{colors.border}"
  caption:
    textColor: "{colors.muted}"
  dialog:
    width: 460px
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
---
# PlayerMode design

## Overview
A Chinese-language product UI for immersive role conversations, not a landing page. The signature is a restrained serif character title above a quiet long-form reading surface. No hero, gradients, stat cards or new chat renderer. Native SillyTavern owns messages, input, generation, scrolling and confirmation of a new conversation.

## Colors
Runtime tokens in style.css are the canonical values, mapped one-to-one from colors above (primary maps to accent) to --pm-bg, --pm-surface, --pm-border, --pm-text, --pm-muted, --pm-accent, --pm-error. Document and CSS change together. Only the enabled-mode scope overrides host styling. Extension-owned controls have their own token scope. Accent is emphasis, not permission status.

## Typography
Local system fonts only; serif character names provide identity, system sans handles Chinese body text and controls. Long replies remain full-width readable blocks. Preserve source rich text, images and code.

## Layout
916px outer shell with 28px side padding gives an approximately 860px reading area. One native chat scroller, stable scrollbar gutter, native composer below it. At 700px use a two-row header, two-column shelf and 44px toolbar targets; below 360px use a single shelf column; retain safe-area padding and dynamic viewport height. Dialog is scrollable within the viewport.

## Elevation & Depth
Header layer --pm-z-header: 100; status layer --pm-z-status: 200. Modal uses the browser top layer via dialog.showModal, with inert background. No maximal z-index values. Shadows only for overlays.

## Shapes
Messages use 16px radii, controls 10px, password dialog 20px. User messages receive a subtle surface; assistant replies stay calm and open, without narrow bubbles.

## Components
Canonical ownership: host chat and new-chat confirmation; PlayerMode shared button factory, password dialog and inline validation; native settings persistence via settings.js; extension-scoped scrollbars. Password inputs have real labels, reveal controls, busy state, inline errors, Escape/cancel, focus restoration. Do not use browser alert/confirm/prompt. User password is never a design asset or shipped config.

## Do's and Don'ts
Honor reduced motion and forced colors. Keep button geometry stable during operations. Never alter original send/stop visibility logic, serialize chat into a new renderer, or write non-PlayerMode settings fields directly. Test host theme restoration when OFF. The UI password is not server authorization.

## Story shelf and account navigation (0.4.0)
The entry screen is a personal story library: serif names, native card portraits, deliberate whitespace and small descriptive labels. No external fonts or stock imagery. Missing portraits fall back to a decorative character initial in the same fixed-height cover, avoiding layout shifts. Keep the original reading palette as midnight; the optional rain preset is specified below. The shelf uses 916px maximum width, 3 columns on desktop, 2 on mobile, 1 on very narrow screens. Preserve role names with wrapping and native rich text inside chat.

Canonical owners: host.js reads native identity and generation status; navigation.js verifies role selection before new/open operations and reads native per-session history; library.js owns only role/history discovery, never chat rendering. The toolbar always offers a return to the shelf. Shelf new-chat uses the configured default; per-role new-chat uses that role; chat new-chat uses the selected allowed role. Switching account returns to native login through native logout. This extension owns no authentication service.

Status text accompanies every status dot. Account identity stays visible. Keep native send/stop state unchanged. Guard generation and unsent drafts when switching; loading and error/retry states belong to the list, transient action errors to the existing status region. Prevent duplicate submissions. A missing role or failed native selection never falls back to assistant. Native confirmation owns creation/cancellation.

The role configuration uses labelled native checkbox/radio controls, a mandatory default, and current-password verification. When all characters are enabled, individual checkboxes are disabled to clarify precedence. Role/password dialogs share the same form geometry, validation, busy state and cancellation behavior. Focus moves to the new shelf heading for assistive technology and back to the composer after opening chat; keyboard controls retain visible focus rings. Heading focus itself has no decorative ring. Native account switch focuses Cancel first.

## Verification contract
Run node tests.mjs and the premium static audit. Test library navigation, role selection failure, empty/error states, default role, native modal cancellation, password gating, mobile long text and restored host UI. Simulated host checks are explicitly separate from real model, worldbook, native account isolation and physical keyboard checks (see VERIFICATION.md).

## Theme presets (0.5.0)
Runtime style.css remains canonical. Midnight retains the original palette. Rain maps --pm-bg #121C1D, --pm-surface #1E2B2B, --pm-border #435957, --pm-text #E8E4D7, --pm-muted #B3BFB5, --pm-accent #D8B879. Hover/active/accent-hover/on-accent/code are #2C3D3B / #354A46 / #E7CA92 / #121C1D / #0E1617. The signature is a narrow warm book spine; preserve portraits without filters and avoid ambient animation. Semantic tokens cover shelf, native reading surface and owned dialogs. Native host overrides still require playermode-active.

The header theme action opens the existing dialog pattern with labelled native radio options. Preview is immediate; Cancel/Escape restores the last committed theme; Use commits a browser-local, account-namespaced appearance key. This is deliberately independent of password/shared settings. Storage failures allow page-only appearance with truthful feedback. themes.js owns preference validation and persistence. No server requests occur for theme changes.

At user request, further verification stopped after isolated tests; 0.5.0 browser visual review and design audits are pending.

Letter preset: background #EBEEE5, surface #F6F7F0, border #A4B0A4, text #2F3933, muted #58665A, accent #486448; hover #DCE4D6, active #CFDAC8, accent-hover #3B543B, on-accent #FFFFFF, code #DDE4D8, error #A32D38. This optional light palette evokes pale letters and green ink. Shared theme dialog adds native labelled range inputs for body size (14–22px) and leading (1.60–2.20). The reading sample and native message text consume --pm-reading-size and --pm-reading-leading; composer size stays unchanged. Preview is reversible, commit persists the combination, and cancel restores both palette and reading settings. Final three-theme version was not validated, per user request.

## Story-room composition and campus edition (0.6.0)
The custom frontend-design brief asks for practical visual identity beyond palette switching. The shelf now resembles books placed beside a reading window: one restrained SVG scene, two-column volumes, separate bookmark actions, and quiet history rows. This is an intentional evolution from the original three-column cards. Search/collection controls operate on already allowed characters; bookmark buttons are siblings of open-role buttons, never nested interactive targets. On mobile, cover and caption stack without reducing touch targets. Motion is limited to a small cover lift, removed for reduced motion. Portraits remain native; no external assets or fonts are downloaded.

Canonical owners: motifs.js builds decorative SVGs with createElementNS and aria-hidden; library.js owns search, collection and discovery state; the existing dialog and theme preference module own appearance. Bookmarks store only avatar identifiers under PlayerMode.bookmarks.v1 per native account and browser. The current-chat return action reveals the existing native DOM. It does not select, save or create a chat.

Fugou theme is a dedicated presentation for the user's “扶沟高中 · 窗世界”: classroom window/desk/exercise-book illustration, document-style labels, double rules and paper-margin message details. Palette: background #182522, surface #24352F, border #536B5D, text #F0EAD7, muted #BBC5B5, accent #E0BF7D, hover #31493D, active #405A49, accent-hover #ECD09C, on-accent #182522, code #121E1B, error #FFB5B5. It uses the same semantic token adapter as the other themes. A classroom-at-dusk visual is the provisional direction; no worldbook lore or actual school branding is inferred. Local Kai-style character names are a bounded campus variant; body readability retains the established Chinese fallback stack.

Per the user's instruction, the 0.6.0 implementation was not verified or visually reviewed before publication.

## Theme dialog and navigation repair (0.6.1)
The appearance dialog keeps its title, explicit dismiss button and action footer visible while only the options and reading controls scroll. It uses a bounded dynamic viewport height, a two-column theme grid on desktop and one column on narrow screens. All dismiss/apply targets are at least 44px. Close, Cancel and Escape restore the last committed appearance and focus the trigger; Apply commits the preview. This is the canonical pattern for a long settings dialog with required bottom actions.

New-chat confirmation remains a native Popup. host.js awaits the result and calls native doNewChat with deletion disabled; navigation.js keeps its operation lock through the full confirmation/create flow, saves before switching and rechecks role/chat identity. library.js closes only after successful completion, retaining its current view on cancellation or failure. Native save functions may absorb failures; awaiting them is not a server persistence guarantee.

0.6.1 targeted verification is recorded separately in VERIFICATION.md. The simulated-host browser checks cover the repaired dialog on desktop and a 390×600 viewport; actual model, worldbook and multi-account end-to-end validation remain outside this release's evidence.

## History discovery (0.6.2)
The history list reuses the shelf's searchControl factory, icon, underline and focus treatment. Search matches already loaded role-scoped names and preview strings, never full transcripts; no new backend request is issued while typing. The empty-result copy provides a recovery instruction, while a status line shows matched and displayed counts. Explicit load-more applies after filtering and query changes reset paging. Composition defers filtering until the committed Chinese input arrives. Clearing is immediate and restores input focus.

Queries remain in page memory per role, deliberately excluded from URLs and persistent storage because they can contain private story text and this extension shares the host URL. The history search is hidden until a nonempty successful response; loading, empty history and failure retain the existing list feedback and retry flow. Action busy state disables search inputs as well as buttons. The visual variant is a simple full-width discovery row, not another card or modal; existing theme tokens remain canonical.
