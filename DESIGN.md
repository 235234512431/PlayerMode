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
