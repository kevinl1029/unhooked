# Unhooked Design System Prompt

Use this prompt when working with AI tools (Claude.ai, v0.dev, etc.) to generate UI mockups that match the Unhooked design system.

---

## Copy This Entire Section for External Tools

```
# Unhooked Design System

You are designing UI components for Unhooked, a nicotine cessation app. Follow this design system exactly.

## Brand Philosophy
- **Calm and clean**: Minimalist UI, no clutter
- **Trustworthy**: Professional polish with soft animations
- **Focused**: Every element serves the user's quit journey
- **Dark mode only**: Deep teal backgrounds, light text

## Color Palette

### Background
- Page background: `radial-gradient(circle at top, #104e54 0%, #041f21 100%)`
- The gradient is fixed (doesn't scroll)

### Brand Colors
| Token | Value | Usage |
|-------|-------|-------|
| `brand-bg-light` | `#104e54` | Gradient start |
| `brand-bg-dark` | `#041f21` | Gradient end |
| `brand-accent` | `#fc4a1a` | Primary orange (CTAs, highlights) |
| `brand-accent-light` | `#f7b733` | Orange gradient endpoint |
| `brand-glass` | `rgba(13, 92, 99, 0.35)` | Card backgrounds |
| `brand-glass-input` | `rgba(31, 108, 117, 0.5)` | Input backgrounds |
| `brand-border` | `rgba(255, 255, 255, 0.1)` | Subtle borders |
| `brand-border-strong` | `rgba(255, 255, 255, 0.4)` | Emphasized borders |

### Text Colors
| Token | Value | Usage |
|-------|-------|-------|
| `white` | `#ffffff` | Primary text, headings |
| `white-85` | `rgba(255, 255, 255, 0.85)` | Secondary text, body copy |
| `white-65` | `rgba(255, 255, 255, 0.65)` | Tertiary text, labels, timestamps |

## Typography

### Font
- **Family**: Inter (Google Fonts)
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Scale
| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| Hero (desktop) | 2.75rem | 700 | Landing page headlines |
| Hero (mobile) | 1.9rem | 700 | Landing page headlines |
| H1 | 2.25rem - 2.5rem | 700 | Page titles |
| H2 | 1.5rem - 2rem | 600-700 | Section headings |
| H3 | 1.25rem | 600 | Card titles |
| Body | 1rem | 400 | Default text |
| Small | 0.875rem | 400 | Labels, captions |
| Eyebrow | 0.55rem | 500 | Uppercase labels, `letter-spacing: 0.35em`, `opacity: 0.65` |

## Component Styles

### Cards (Glass Effect)
```css
.glass-card {
  background: rgba(13, 92, 99, 0.35);
  backdrop-filter: blur(12px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
  padding: 24px - 48px; /* varies by card size */
}
```
- On mobile: `border-radius: 8px` (rounded-lg)
- On desktop: `border-radius: 24px` (rounded-card)

### Primary Button
```css
.btn-primary {
  background: linear-gradient(135deg, #fc4a1a, #f7b733);
  color: white;
  border-radius: 9999px; /* pill shape */
  padding: 12px 24px; /* or 18px 36px for larger */
  font-weight: 600;
  box-shadow: 0 4px 24px rgba(252, 74, 26, 0.3);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 32px rgba(252, 74, 26, 0.4);
}
```

### Secondary/Ghost Button
```css
.btn-secondary {
  background: rgba(13, 92, 99, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  color: white;
  padding: 12px 24px;
  font-weight: 500;
}
.btn-secondary:hover {
  background: rgba(31, 108, 117, 0.5);
}
```

### Inputs
```css
.input {
  background: rgba(31, 108, 117, 0.5);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  color: white;
  padding: 14px 18px;
}
.input:focus {
  border-color: rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.15);
}
.input::placeholder {
  color: rgba(255, 255, 255, 0.65);
}
```

### Icon Containers
```css
.icon-container {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(252, 74, 26, 0.2); /* accent with opacity */
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-container svg {
  color: #fc4a1a;
  width: 20px;
  height: 20px;
}
```
- Large version: 80px × 80px with 40px icons
- Hero version: 96px × 96px with 48px icons, add `border: 2px solid #fc4a1a`

## Animation

### Fade In Up (Page Load)
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out forwards;
}
```

### Transitions
- Default: `transition: all 0.3s ease`
- Buttons: `transition: all 0.3s ease` (transform + shadow)
- Soft, never jarring

## Layout Patterns

### Page Container
```html
<div class="min-h-screen px-0 py-4 md:p-4">
  <div class="max-w-4xl mx-auto">
    <!-- Content -->
  </div>
</div>
```

### Card Grid
```html
<div class="grid gap-4 md:grid-cols-2">
  <!-- Cards -->
</div>
```

### Vertical Stack
```html
<div class="space-y-8">
  <!-- Sections -->
</div>
```

## Spacing

Use 4px base unit:
- `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`
- Card padding: `24px` (small), `32px` (medium), `48px` (large)
- Section gaps: `32px` (space-y-8)
- Element gaps within cards: `12px` - `16px`

## Responsive Breakpoints

- **Mobile**: default (< 768px)
- **Desktop**: `md:` prefix (≥ 768px)
- Mobile-first approach
- Cards: `rounded-lg` on mobile, `rounded-card` on desktop

## Do's and Don'ts

### Do
- Use glass effect cards with blur
- Use pill-shaped buttons
- Use the orange gradient for primary CTAs
- Keep text high contrast (white on dark)
- Add subtle borders to define edges
- Use generous padding and whitespace

### Don't
- Use sharp corners (always rounded)
- Use solid backgrounds (always translucent/glass)
- Use colors outside the palette
- Add unnecessary decorations or icons
- Use shadows that are too harsh
- Crowd elements together
```

---

## Current Dashboard Reference

Here's the current dashboard layout for context when designing new elements:

### Dashboard States

The dashboard has 4 states:
1. **Not Started** - Welcome card + "What to expect" card
2. **In Progress** - Progress indicator + Next session CTA
3. **Ceremony Ready** - Progress complete + "Begin Ceremony" CTA
4. **Post-Ceremony** - "You're Unhooked" header + Artifact cards + Support section

### Post-Ceremony Dashboard (Where Reinforcement Sessions Will Live)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│            ╭───────────────────────╮                        │
│            │         ✓             │  96px circle           │
│            ╰───────────────────────╯  orange border         │
│                                                             │
│              You're Unhooked                                │
│           Completed on January 15, 2026                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────┐  ┌─────────────────────────┐
│ 🎙️ Your Journey         │  │ 💬 Your Message          │
│ 3:45                    │  │ 1:22                    │
│ [▶ Play]                │  │ [▶ Play]                │
└─────────────────────────┘  └─────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📄 Your Toolkit                                              │
│ Quick reference guide                                       │
│ [View →]                                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Need Support?                                  │
│                                                             │
│  [I'm struggling]          [Give me a boost]                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### In-Progress Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Progress                           │
│                                                             │
│    ●────●────●────○────○    (Progress dots)                 │
│    1    2    3    4    5                                    │
│                                                             │
│           3 of 5 illusions explored                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Continue: The Focus Illusion                               │
│  See how nicotine disrupts focus rather than enhancing it.  │
│                                                             │
│  [Continue]                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Card Component Pattern

```html
<div class="glass rounded-lg md:rounded-card p-6 shadow-card border border-brand-border">
  <div class="flex items-center gap-3 mb-3">
    <!-- Icon container -->
    <div class="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center">
      <svg class="w-5 h-5 text-brand-accent">...</svg>
    </div>
    <!-- Text -->
    <div>
      <h3 class="text-lg font-semibold text-white">Card Title</h3>
      <p class="text-sm text-white-65">Subtitle or metadata</p>
    </div>
  </div>
  <!-- Action -->
  <button class="w-full btn-primary text-white px-4 py-2 rounded-pill font-medium">
    Action
  </button>
</div>
```

### Support Button Pattern

```html
<button class="flex-1 px-4 py-3 rounded-pill border border-brand-border bg-brand-glass text-white font-medium hover:bg-brand-glass-input transition">
  Button Text
</button>
```

---

## New Components Needed for Reinforcement Sessions

Based on the spec, you'll need to design:

### 1. Moment Cards
- Display user's breakthrough quote
- Show illusion name + date
- "Reconnect with this →" button
- Should feel like a "memory" or "insight" - slightly different from standard cards

### 2. Revisit Buttons
- Small, inline with illusion progress list
- Ghost/secondary button style
- "Revisit" label

### 3. "I Need Support" Button
- More prominent than revisit buttons
- Only visible post-ceremony
- Empathetic, not alarming

### 4. Session Header (Reinforcement)
- Distinguish from core sessions
- Show "Reconnecting: [Illusion Name]"
- Show "Your last session: X days ago"

### 5. Moment Replay Component
- In-chat display of user's own quote
- "You said this on Day 2:" label
- Quoted text in a special container
- "Does that still feel true?" prompt

### 6. Empty State Card
- For illusions with no captured moments
- Warning without alarm
- "This one might benefit from another conversation"
