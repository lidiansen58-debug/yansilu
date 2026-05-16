# Marketing Site Redesign V2

## 1. Goal

This document is the implementation baseline for the next official website pass of Yansilu.

The redesign should make the site feel:

- Technological, but not cold.
- Grand, but still easy to operate.
- Mysterious, but not obscure.
- Wise, but not preachy.

The site must explain the product in one glance, make the workflow easy to understand, and preserve all current registration, login, pricing, download, billing, and checkout behavior.

### 2026-05-16 Narrative Correction

The official site should present Yansilu as a complete product, not as a single-topic knowledge base. Demo content is supporting proof, not the main product identity.

- The homepage and product page must explain the full workflow: import, literature notes, permanent notes, explicit relations, index cards, writing scaffolds, AI boundaries, local-first storage, export, pricing, and download.
- `/demo` should become a demo center. The primary demo should be the product-method story based on 《卡片笔记写作法》. The existing Yijing demo remains valuable, but only as a secondary case for complex semantic relations.
- Yijing copy should not appear as the primary homepage story, the primary CTA, or the definition of the product.
- The follow-up plan is tracked in `docs/OFFICIAL_SITE_AND_DEMO_REPLAN_2026-05-16.md`.

## 2. Brand Direction

### Core Idea

Yansilu is a thinking workspace that helps people turn knowledge into their own wisdom.

It is not positioned as:

- a generic note archive
- a one-click AI writing tool
- a pure document manager
- a decorative knowledge graph

It is positioned as:

- a research and writing workspace
- a local-first knowledge workflow
- a thinking system for distillation, connection, and writing
- an AI-assisted product with clear authorship boundaries

### Visual Metaphor

Use a "deep-space research observatory" direction:

- deep cosmic background
- luminous knowledge trails
- precise interface lines
- subtle glass and metal surfaces
- restrained gold, cyan, and jade accents
- product screenshots or abstract product panels that feel like instruments for thinking

Avoid returning to the V1 warm paper style as the dominant visual language. Warmth can appear in gold highlights, but the overall site should now feel more intelligent, spacious, and technological.

## 3. Information Architecture

### Global Navigation

Primary nav:

- 产品 -> `/product`
- 演示 -> `/demo`
- 定价 -> `/pricing`
- 下载 -> `/download`
- 工作台 -> `/app`

Session-aware nav:

- Guest: 登录 -> `/login`, 免费开始 -> `/register`
- Authenticated: 账户 -> `/billing`, 退出登录

The header must stay predictable on every marketing page. Do not change the placement or meaning of these entries between pages.

### Routes And Page Jobs

| Route | Page | Job |
|---|---|---|
| `/` | Home | Explain what Yansilu is, why it matters, and where to start. |
| `/product` | Product | Show the full knowledge-to-wisdom workflow and product boundaries. |
| `/demo` | Demo Center | Let visitors choose a workflow demo; primary demo is the card-note writing method, with Yijing as a secondary complex-graph case. |
| `/demo/zettelkasten` | Card-Note Demo | Show how reading notes become permanent notes, relation reasons, index cards, and writing scaffolds. |
| `/demo/yijing` | Yijing Demo | Preserve the existing Yijing knowledge-network demo as a secondary case for rich semantic relations. |
| `/pricing` | Pricing | Help visitors choose Free or Pro without making pricing feel like selling more AI output. |
| `/download` | Download | Make the desktop app release status, installer path, and local-first value clear. |
| `/register` | Register | Let a new user start quickly and understand the next step. |
| `/login` | Login | Let a returning user enter with minimum friction. |
| `/billing` | Billing | Show account, plan, billing mode, and subscription actions clearly. |
| `/checkout/success` | Checkout Success | Confirm upgrade status and direct the user to billing or download. |
| `/checkout/cancel` | Checkout Cancel | Explain that payment was not completed and provide safe next actions. |

## 4. Page-Level Structure

### Home

Purpose: one-glance product understanding.

Recommended sections:

1. Hero: H1 is `研思录`; supporting line explains "把知识变成你的智慧".
2. Three-step promise: 输入资料 -> 提炼观点 -> 进入写作.
3. Product signal: a clear visual showing notes, viewpoints, index cards, and writing scaffold.
4. Why it is different: paraphrase first, one-sentence thesis, traceable writing, AI with boundaries.
5. Trust and ownership: local-first, exportable, author remains in control.
6. Final CTA: 免费开始, 下载桌面版.

Keep the homepage easy to scan. Avoid making the user switch tabs just to understand the product.

### Product

Purpose: explain the system.

Recommended sections:

1. Product hero: one sentence that says this is a workflow, not just a feature list.
2. Workflow rail: 文献笔记 -> 永久笔记 -> 索引组织 -> 写作脚手架.
3. Capability map: what each module does and what problem it solves.
4. AI boundaries: AI assists distillation, structure, and conflict checking; it does not replace authorship.
5. CTA: start or download.

### Pricing

Purpose: choose plan with confidence.

Recommended sections:

1. Pricing hero: "先建立工作流，再按需要升级".
2. Plan cards: Free and Pro only.
3. Comparison table: clear rows, no ambiguous marketing claims.
4. FAQ: ownership, cancellation, local content, when Pro is useful.
5. CTA: 免费开始, 下载桌面版.

### Download

Purpose: make installation feel real and trustworthy.

Recommended sections:

1. Download hero: desktop app as the main long-term entry.
2. Release status: version, generated time, available files.
3. Installer path: Windows installer first.
4. Install steps: download -> install -> choose vault -> login -> update later.
5. Auto update note: state current readiness honestly.

### Account Flow Pages

Purpose: reduce friction and ambiguity.

Register and login:

- One primary form.
- Visible label for email and code.
- Clear test-code hint only when it reflects current implementation.
- Value reminder in the side panel.

Billing and checkout:

- Show the current state first.
- Put the safest next action first.
- Keep mock and Stripe mode visible when relevant.
- Never hide plan status or next renewal behind decorative UI.

## 5. Visual System

### Color Tokens

Use a dark, luminous palette with multiple accent families so the site does not become one-note.

```css
:root {
  --site-bg: #030711;
  --site-bg-2: #07111f;
  --site-surface: #0b1324;
  --site-surface-2: #111a2d;
  --site-glass: rgba(13, 23, 42, 0.72);
  --site-ink: #f4f8ff;
  --site-ink-soft: #c6d1e3;
  --site-muted: #8794aa;
  --site-line: rgba(183, 205, 255, 0.16);
  --site-cyan: #7ddfff;
  --site-jade: #7df0bd;
  --site-gold: #d8b76a;
  --site-danger: #ff6b7a;
}
```

Usage:

- Cyan: primary product intelligence, links, focus rings.
- Jade: local-first, safety, ownership, positive status.
- Gold: wisdom, premium, Pro plan.
- Dark blue/black: page foundation.

### Typography

Recommended families:

- Display: `Exo 2`, `Exo`, `Noto Sans SC`, sans-serif.
- Body: `Noto Sans SC`, `MiSans`, `HarmonyOS Sans SC`, sans-serif.
- Technical labels: `Roboto Mono`, `JetBrains Mono`, monospace.

Rules:

- Use `letter-spacing: 0` by default.
- Use large type only for page heroes.
- Keep body copy at 16px or larger.
- Keep line height between 1.55 and 1.8 for Chinese copy.
- Avoid long paragraphs inside small panels.

### Layout

- Desktop container: max width around 1180-1240px.
- Mobile gutter: 20px.
- Section spacing: 72-112px desktop, 48-72px mobile.
- Cards and panels: radius 18-28px, but avoid nesting cards inside cards.
- Hero: brand/product must be a first-viewport signal.
- The first viewport should show a hint of the next section on desktop and mobile.

### Components

Buttons:

- Minimum height 44px.
- Primary action: luminous cyan or cyan-to-jade.
- Secondary action: transparent dark glass with visible border.
- Disabled state: reduced opacity and no hover lift.

Panels:

- Use glass only when it helps hierarchy.
- Use subtle borders and top-edge highlights.
- Avoid heavy shadows that look like generic SaaS templates.

Status messages:

- Success: jade.
- Info: cyan.
- Warning or unresolved billing state: gold.
- Error: danger.
- Always include text, not color alone.

Motion:

- Use 150-300ms for UI state changes.
- Use transform and opacity only.
- Respect `prefers-reduced-motion`.
- Avoid continuous decorative animation except very subtle background drift.

## 6. Copy System

### Main Copy

Primary headline system:

- Home H1: `研思录`
- Home supporting line: `把知识变成你的智慧。`
- Product framing: `一条从资料、理解、观点到写作的思考路径。`
- Pricing framing: `先建立你的思考工作流，再按需要升级。`
- Download framing: `把长期研究和写作放回你的本地工作台。`

### CTA Labels

Use these labels consistently:

- `免费开始`
- `下载桌面版`
- `进入工作台`
- `查看定价`
- `升级到 Pro`
- `管理订阅`

Avoid over-explaining CTA labels.

### Tone

The voice should be:

- clear
- calm
- precise
- confident
- slightly mysterious

Avoid:

- generic AI hype
- excessive philosophical abstraction
- fake metrics
- claims that the current product cannot support
- "one-click wisdom" style promises

## 7. Functional Hooks To Preserve

Do not remove or rename these hooks without updating the corresponding scripts.

Session:

- `data-guest-only`
- `data-auth-only`
- `data-session-plan`
- `data-session-email`
- `data-session-logout`

Home:

- `data-tour-tab`
- `data-tour-panel`

Auth:

- `body[data-auth-mode]`
- `#authForm`
- `data-next-path`

Pricing:

- `data-pricing-status`
- `data-pricing-pro-meta`
- `data-upgrade-plan`
- `data-pricing-manage`

Download:

- `data-download-status`
- `data-download-version`
- `data-download-generated`
- `data-download-primary`
- `data-download-primary-note`
- `data-download-files`

Billing:

- `data-billing-mode`
- `data-billing-mode-message`
- `data-billing-portal-message`
- `data-billing-plan`
- `data-billing-plan-meta`
- `data-billing-plan-action`
- `data-billing-manage`
- `data-billing-status`
- `data-billing-email`
- `data-billing-renews`

Checkout:

- `data-checkout-status`
- `data-checkout-plan`
- `data-checkout-billing-status`
- `data-checkout-mode`
- `data-checkout-cancel-status`

## 8. Accessibility And UX Baseline

Required checks:

- Keyboard focus visible on all links, buttons, and inputs.
- Header nav order matches visual order.
- No horizontal scroll at 375px.
- Body text contrast meets WCAG AA.
- Touch targets are at least 44px high.
- Forms use visible labels.
- Route-level pages keep a logical heading hierarchy.
- Reduced motion disables non-essential animation.
- Dynamic download, pricing, billing, and checkout messages remain readable in loading, success, and error states.

## 9. Implementation Order

1. Home page and shared CSS tokens.
2. Product page using the new workflow language.
3. Pricing and download pages.
4. Register, login, billing, and checkout pages.
5. Full route and mobile QA.

Each step should be browser-verified before moving to the next one.

## 10. Acceptance Criteria

The V2 website is ready when:

- All marketing routes return 200.
- No page contains mojibake or replacement characters.
- The header and footer are visually consistent across routes.
- The homepage explains the product without requiring tab switching.
- Pricing and download dynamic scripts still work.
- Register/login/billing/checkout flows still work.
- Desktop and 375px mobile layouts have no horizontal overflow.
- Browser console is clean for the main routes.
