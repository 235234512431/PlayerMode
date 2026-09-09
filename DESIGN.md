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
916px outer shell with 28px side padding gives an approximately 860px reading area. One native chat scroller, stable scrollbar gutter, native composer below it. At 600px use compact spacing and 44px toolbar targets; retain safe-area padding and dynamic viewport height. Dialog is scrollable within the viewport.

## Elevation & Depth
Header layer --pm-z-header: 100; status layer --pm-z-status: 200. Modal uses the browser top layer via dialog.showModal, with inert background. No maximal z-index values. Shadows only for overlays.

## Shapes
Messages use 16px radii, controls 10px, password dialog 20px. User messages receive a subtle surface; assistant replies stay calm and open, without narrow bubbles.

## Components
Canonical ownership: host chat and new-chat confirmation; PlayerMode shared button factory, password dialog and inline validation; native settings persistence via settings.js; extension-scoped scrollbars. Password inputs have real labels, reveal controls, busy state, inline errors, Escape/cancel, focus restoration. Do not use browser alert/confirm/prompt. User password is never a design asset or shipped config.

## Do's and Don'ts
Honor reduced motion and forced colors. Keep button geometry stable during operations. Never alter original send/stop visibility logic, serialize chat into a new renderer, or write non-PlayerMode settings fields directly. Test host theme restoration when OFF. The UI password is not server authorization.
