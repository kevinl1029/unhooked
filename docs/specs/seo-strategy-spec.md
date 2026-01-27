# Unhooked: SEO & Landing Page Optimization Strategy

**Version:** 1.0
**Last Updated:** 2026-01-17
**Status:** Ready for Implementation
**Document Type:** Technical Specification + Strategy

---

## Strategic Overview

### Why SEO Matters for Unhooked

Unhooked is in market validation phase, using a landing page to capture founding members before the full product launches in April 2026. SEO optimization serves three strategic purposes:

1. **Organic Discovery** — People actively searching for nicotine cessation solutions are high-intent prospects. Ranking for these terms brings qualified traffic without ad spend.

2. **Paid Campaign Effectiveness** — Google Ads, Instagram, and TikTok campaigns will drive traffic to our landing page. Proper meta tags, Open Graph images, and structured data ensure:
   - Professional appearance when links are shared
   - Higher Quality Scores in Google Ads (landing page experience factor)
   - Better click-through rates on social shares

3. **Credibility & Trust** — Rich search results (FAQ snippets, organization info) signal legitimacy to users researching nicotine cessation options.

### Current State

The landing page (`pages/index.vue`) has minimal SEO:
- Basic title: "Unhooked — Freedom from Nicotine"
- Basic meta description
- No Open Graph or Twitter Card tags
- No structured data (JSON-LD)
- No robots.txt or sitemap.xml
- No favicon set configured

---

## Market Research: Nicotine Consumption Landscape (2025-2026)

### Understanding Our Target Market

To optimize SEO effectively, we need to understand *how* people consume nicotine and *who* is searching for help quitting.

### Nicotine Consumption Methods in the US

| Method | US Users | Trend | Key Demographics |
|--------|----------|-------|------------------|
| **Cigarettes** | ~28.8 million adults (11.6% of population) | Declining 17% over 5 years | Ages 45-64 highest; lower income/education |
| **E-cigarettes/Vaping** | ~8% of adults; 18% of ages 18-29 | Growing among young adults | Young adults 21-24 highest (15.5%); male-skewed |
| **Nicotine Pouches (Zyn)** | ~2.9% of adults ever used; 12% of ages 15-24 currently use | Explosive growth (250% since 2023) | Male, White, non-Hispanic; now 2nd most popular among youth |

**Sources:** [CDC Data Brief](https://www.cdc.gov/nchs/products/databriefs/db524.htm), [SingleCare Smoking Statistics](https://www.singlecare.com/blog/news/smoking-statistics/), [CDC Foundation](https://www.cdcfoundation.org/blog/Nicotine-Pouch-Use-Surges-Among-Young-People), [Truth Initiative](https://truthinitiative.org/research-resources/emerging-tobacco-products/what-zyn-and-what-are-oral-nicotine-pouches)

### Nicotine Pouch Market Explosion

Nicotine pouches represent a **critical emerging market** for Unhooked:

- **Sales growth:** 250% increase from Jan 2023 to Aug 2025
- **Monthly sales:** $446.8 million (April 2025), up from $145.5 million (Jan 2023)
- **Zyn dominance:** 84.3% market share; 70%+ of US nicotine pouch category
- **FDA approval:** 20 Zyn products authorized in January 2025
- **Youth adoption:** Use among 10th/12th graders doubled from 1.3% to 2.6% (2023-2024)
- **Retention problem:** 73% of young people who tried pouches are still using them

**Source:** [Yahoo Finance - 2025 Nicotine Pouch Report](https://finance.yahoo.com/news/2025-nicotine-pouch-oral-nicotine-120000777.html)

### Who Wants to Quit?

| Statistic | Value | Source |
|-----------|-------|--------|
| Young adults (18-24) planning to quit in 2026 | 67% | [Truth Initiative](https://truthinitiative.org/press/press-release/new-truth-initiative-survey-indicates-most-young-people-who-use-nicotine-say) |
| Young nicotine users intending to quit within 1 year | 60% | Truth Initiative |
| Vapers who tried to quit but couldn't | 53% (up from 28% in 2020) | Truth Initiative |
| Young vapers (18-24) with quitting as resolution | 48% | [Carolina Outpatient Detox](https://carolinaoutpatientdetox.com/vaping-addiction-statistics/) |
| Cold turkey success rate | 3-5% | Truth Initiative |

**Key Insight:** There is massive demand for quitting help, but traditional methods fail. This validates Unhooked's differentiated approach.

---

## Keyword Strategy

### Market Size by Search Intent

Based on the user population data above, we can estimate relative search demand:

| Category | US User Base | Estimated Monthly "Quit" Searches | Priority |
|----------|--------------|-----------------------------------|----------|
| **Quit Smoking** | 28.8 million smokers | Very High (largest absolute volume) | High |
| **Quit Vaping** | ~26 million adults vape | High (younger, more internet-active) | High |
| **Quit Zyn / Pouches** | ~9.6 million ever-users | Medium-High (fastest growing) | Medium-High |
| **Quit Nicotine** (general) | All of above | Medium (umbrella term) | Medium |

**Note:** Specific monthly search volume data (e.g., "quit vaping" = X searches/month) requires paid SEO tools like Ahrefs or Semrush. However, user population data and quit intent surveys give us directional guidance.

### Primary Target Keywords

#### Tier 1: High Intent, High Volume
| Keyword | Target Audience | Why Include |
|---------|-----------------|-------------|
| quit smoking | 28.8M smokers | Largest user base, established search behavior |
| quit vaping | 26M vapers | Younger demographic, high quit intent (48-67%) |
| how to quit vaping | Vapers | Informational intent, top-of-funnel |
| how to quit smoking | Smokers | Informational intent, top-of-funnel |
| stop smoking | Smokers | Synonym variation |
| stop vaping | Vapers | Synonym variation |

#### Tier 2: Emerging & Growing
| Keyword | Target Audience | Why Include |
|---------|-----------------|-------------|
| quit zyn | Pouch users | Fastest-growing category, 250% sales growth |
| how to quit zyn | Pouch users | Informational intent for emerging audience |
| quit nicotine pouches | Pouch users | Generic term for non-Zyn brands |
| zyn addiction | Pouch users | Problem-aware searchers |
| nicotine pouch withdrawal | Pouch users | Pain-point focused |

#### Tier 3: Umbrella / Long-Tail
| Keyword | Target Audience | Why Include |
|---------|-----------------|-------------|
| nicotine cessation | All | Clinical/professional term |
| quit nicotine | All | Umbrella term |
| nicotine addiction help | All | Problem-aware |
| quit vaping without withdrawal | Vapers | Long-tail, high intent |
| quit smoking without willpower | Smokers | Differentiator for Unhooked method |

### Keyword Integration Strategy

**Title Tag (60 chars max):**
```
Unhooked — Quit Vaping & Smoking Without Willpower
```

**Meta Description (155 chars max):**
```
Stop vaping, quit smoking, or break free from Zyn. Unhooked eliminates your desire for nicotine—no patches, no willpower, no substitutes. 30-day guarantee.
```

**Why this approach:**
- Includes primary keywords: "quit vaping," "quit smoking"
- Adds "Zyn" for emerging pouch market
- "Without willpower" differentiates from traditional methods
- "30-day guarantee" reduces perceived risk
- Covers all three nicotine categories in one description

---

## Goals & Success Metrics

### Primary Goals

| Goal | How SEO Helps |
|------|---------------|
| Capture founding members ($199) | Higher organic traffic, better ad landing page quality |
| Build email list (mailing list) | Social sharing drives awareness |
| Validate market demand | Search impressions indicate interest volume |

### Success Metrics (Post-Implementation)

- Google Search Console showing indexed pages
- Rich results appearing for FAQ queries
- OG image displaying correctly on social shares
- No crawl errors in Search Console
- Landing page passing Core Web Vitals

---

## Technical Implementation

### 1. Robots.txt

**Why:** Tells search crawlers which pages to index and where to find the sitemap. Without this, crawlers may index authenticated pages (dashboard, sessions) that should remain private.

**File:** `public/robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://getunhooked.app/sitemap.xml

# Block authenticated/internal pages
Disallow: /api/
Disallow: /dashboard
Disallow: /onboarding
Disallow: /session/
Disallow: /ceremony
Disallow: /journey
Disallow: /toolkit
Disallow: /support
Disallow: /check-in/
Disallow: /follow-up/
Disallow: /checkout/success
Disallow: /checkout/cancel
Disallow: /auth/callback
Disallow: /test-login
```

### 2. Sitemap.xml

**Why:** Helps search engines discover all public pages. Essential for new sites with few backlinks.

**File:** `public/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://getunhooked.app/</loc>
    <lastmod>2026-01-17</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://getunhooked.app/login</loc>
    <lastmod>2026-01-17</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
```

### 3. Web App Manifest

**Why:** Defines how the app appears when installed on mobile devices. Also signals to search engines that this is a web application.

**File:** `public/site.webmanifest`

```json
{
  "name": "Unhooked",
  "short_name": "Unhooked",
  "description": "Quit vaping and smoking permanently with AI-powered nicotine cessation",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#041f21",
  "theme_color": "#104e54"
}
```

### 4. Global SEO Defaults (nuxt.config.ts)

**Why:** Sets baseline SEO for all pages. Individual pages can override these defaults.

**Changes to `nuxt.config.ts`:**

Add to `app.head`:
- `htmlAttrs: { lang: 'en' }` — Tells search engines the content language
- `charset: 'utf-8'` — Ensures proper character encoding
- `theme-color` meta — Browser UI color on mobile
- `robots` meta — Default indexing behavior
- Favicon links — Brand presence in browser tabs
- Manifest link — PWA support

### 5. Landing Page Meta Tags (pages/index.vue)

**Why:** The landing page is our primary conversion page. Rich meta tags improve both search rankings and social sharing appearance.

**Open Graph Tags (Facebook, LinkedIn):**
- `og:type`: website
- `og:site_name`: Unhooked
- `og:title`: Unhooked — Quit Vaping & Smoking Without Willpower
- `og:description`: (matches meta description)
- `og:url`: https://getunhooked.app
- `og:image`: https://getunhooked.app/og-image.png
- `og:image:width`: 1200
- `og:image:height`: 630
- `og:locale`: en_US

**Twitter Card Tags:**
- `twitter:card`: summary_large_image
- `twitter:title`: (matches og:title)
- `twitter:description`: (matches og:description)
- `twitter:image`: (matches og:image)

**Canonical URL:**
```html
<link rel="canonical" href="https://getunhooked.app" />
```

**Why canonical matters:** Prevents duplicate content issues if the page is accessed via different URLs (with/without trailing slash, with UTM params, etc.)

### 6. Structured Data (JSON-LD)

**Why:** Structured data enables rich search results (FAQ dropdowns, organization info, product details). Google prioritizes pages with valid schema markup.

**Schemas to implement:**

**Organization Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Unhooked",
  "url": "https://getunhooked.app",
  "logo": "https://getunhooked.app/og-image.png",
  "description": "AI-powered nicotine cessation program helping people quit vaping and smoking permanently."
}
```

**WebSite Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Unhooked",
  "url": "https://getunhooked.app",
  "description": "Quit vaping and smoking permanently with AI-powered nicotine cessation."
}
```

**SoftwareApplication Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Unhooked",
  "applicationCategory": "HealthApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "199",
    "priceCurrency": "USD"
  }
}
```

**FAQPage Schema:**
Uses the 6 FAQ items from `LandingFAQ.vue` to generate rich FAQ snippets in search results.

**Implementation:** Create `composables/useSeoSchema.ts` to generate these schemas, then inject via `useHead()` in `pages/index.vue`.

---

## Ad Campaign Integration

### Google Ads Preparation

**Landing Page Quality Score Factors:**
1. **Relevance** — Meta tags include target keywords (quit vaping, quit smoking, Zyn)
2. **Transparency** — Clear pricing ($199), guarantee, and contact info
3. **Navigation** — Mobile-friendly, fast loading
4. **Trust** — Professional appearance, structured data

**UTM Parameter Handling:**
- `useUtmTracking.ts` already exists and captures UTM params
- Params are stored in sessionStorage for checkout attribution
- No additional work needed

### Instagram & TikTok Preparation

**Open Graph Image Requirements:**
- 1200x630px for optimal display
- Brand colors (teal gradient background, orange accents)
- Clear headline visible at small sizes
- "Unhooked" branding prominent

**Conversion Tracking Prep:**
Create `composables/useConversionTracking.ts` with placeholder functions for:
- `page_view`
- `cta_click`
- `checkout_started`
- `email_captured`

When analytics is added later, these hooks will be ready.

---

## Asset Requirements

### OG Image (public/og-image.png)

**Specifications:**
- Dimensions: 1200x630px
- Background: Brand teal gradient (#104e54 to #041f21)
- Headline: "Quit Vaping. Quit Smoking. For Good."
- Branding: "Unhooked" text prominently displayed
- Accent: Orange gradient elements (#fc4a1a to #f7b733)
- Font: Inter family
- Safe zone: Keep text within 1100x530 centered area

**Note:** This asset needs to be created manually or with a design tool.

### Favicon Set

**Files needed:**
- `favicon.ico` (multi-resolution: 16x16, 32x32, 48x48)
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` (180x180)

**Design:** Stylized "U" with orange gradient, or abstract "freedom" symbol.

**Note:** Can be generated from a logo using realfavicongenerator.net

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `public/robots.txt` | Create | Crawler directives |
| `public/sitemap.xml` | Create | Page discovery |
| `public/site.webmanifest` | Create | PWA/mobile support |
| `public/og-image.png` | Create | Social sharing image |
| `public/favicon.ico` | Create | Browser tab icon |
| `public/favicon-16x16.png` | Create | Small favicon |
| `public/favicon-32x32.png` | Create | Standard favicon |
| `public/apple-touch-icon.png` | Create | iOS home screen |
| `nuxt.config.ts` | Modify | Global SEO defaults |
| `pages/index.vue` | Modify | Meta tags, OG, JSON-LD |
| `composables/useSeoSchema.ts` | Create | Schema generators |
| `composables/useConversionTracking.ts` | Create | Analytics prep |

---

## Verification & Testing

### Validation Tools

1. **Google Rich Results Test** — https://search.google.com/test/rich-results
   - Validates FAQ schema, Organization schema
   - Should show no errors

2. **Facebook Sharing Debugger** — https://developers.facebook.com/tools/debug/
   - Verifies OG image displays correctly
   - Shows title/description preview

3. **Twitter Card Validator** — https://cards-dev.twitter.com/validator
   - Confirms large image card format
   - Shows preview of tweet appearance

4. **LinkedIn Post Inspector** — https://www.linkedin.com/post-inspector/
   - Verifies professional network sharing

### Manual Verification

- [ ] `curl https://getunhooked.app/robots.txt` returns valid content
- [ ] `curl https://getunhooked.app/sitemap.xml` returns valid XML
- [ ] Browser tab shows favicon
- [ ] iOS Safari "Add to Home Screen" shows apple-touch-icon
- [ ] View page source shows JSON-LD scripts
- [ ] No duplicate meta tags in page head
- [ ] `npm run build` completes without errors

### Post-Deployment

- [ ] Submit sitemap to Google Search Console
- [ ] Request indexing of homepage
- [ ] Monitor for crawl errors over first week

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-17 | Initial SEO strategy specification with market research on vaping, smoking, and nicotine pouch trends |
