# Questions for Konstantinos

Everything the site could not decide on its own. Nothing here blocks a deploy —
each item has a safe default already in place, named below — but each one makes the
site better or more accurate once answered.

Ordered by how much it matters.

---

## 1. The German-language testimonials say you speak German

**Why it needs you.** You told us you are fluent in Greek, English and Italian, and
the site says exactly that — in the About page, in the FAQ, and in the `knowsLanguage`
field of the structured data that search engines and AI assistants read.

But several of the recovered 2015–2018 comments say otherwise, in the customers' own
words. Jana: *"sogar auf deutsch!"* Stefanie: *"versteht und spricht deutsch."*
Ingo & Natalie: *"spricht viele Sprachen."* Elena & Michael originally listed
English, German, Russian, Italian and some French.

**What we did.** The quotes are real and stay as written — except Elena & Michael's
list of languages, which we cut, because it reads as a service promise rather than
an opinion about the massage. That entry is marked `abridged` in
`content/testimonials.json` with the reason recorded.

**What to tell us.** Do you have working German? If you do, say so and we will
adjust the About page and the FAQ to something accurate — "and enough German to get
by" is a genuinely useful thing for a German visitor to read, and Germany is your
largest market: 13 of the 41 comments are in German. If you do not, we leave it as
it is and the quotes stay as dated customer opinions.

---

## 2. Prices

**Current state.** Every price on the site says "on request". The 2015 figures
(29 / 39 / 59 €) are gone from the copy, and `scripts/i18n-check.js` fails the build
if one ever reappears. No `Offer` node exists in the structured data.

**What to tell us.** Your current prices, per treatment and per duration. Or say you
want to keep them on request — that is a legitimate choice and the site is built for
it. When you do give numbers, set `prices.published: true` in
`content/_business.json` and the `Offer` markup switches on by itself.

---

## 3. Hotel partners

**Current state.** The Location page says, generically, that you work with hotels and
apartments in Mastichari, Tigaki and Marmari. It names nobody.

**Why.** The old site listed Princess of Kos, Eurovillage Achilleas, Roseland Hotel
Marmari, Meni More Tigaki and Marianna Apartments Tigaki. Those are from 2015–2018
captures and were never re-verified. Naming a hotel that no longer works with you is
both a factual error and a discourtesy to them.

**What to tell us.** Which of those are still current, and which to add. Then set
`hotelPartners.publish: true` in `content/_business.json` and the named list appears.

---

## 4. Face Massage and Cellulite Massage

**Current state.** Not on the site.

**Why.** They appeared only as dropdown options in the old (non-functional)
reservation widget. No page copy for them was ever written, so there was nothing to
recover and nothing to translate.

**What to tell us.** Do you still offer them? If yes, we need a couple of sentences
about each and they get full pages in all nine languages.

Note on the cellulite one: the old aromatherapy copy claimed the treatment
*"effectively reduces cellulite problems."* That line is not on the new site. It is a
cosmetic-efficacy claim with nothing to substantiate it, and on a health-adjacent
site in the EU it is the kind of sentence that causes trouble. If cellulite massage
comes back, it comes back described by what it feels like, not by what it cures.

---

## 5. Cancellation terms

**Current state.** The Terms page says there is no cancellation fee, and asks people
to tell you as early as they reasonably can.

**What to tell us.** If you want a real cancellation window — "24 hours' notice in
July and August" is common — say so and we will write it in. The current wording is
generous by default, which is the safe direction to be wrong in, but it is your call.

---

## 6. Street address and map

**Current state.** The site publishes Mastichari, Kos, Greece — village and island,
no street. The Ghitonia souvenir shop is named as the place people can find you in
person, because that is what the old site said and it is a landmark rather than a
home address.

**Answered 2026-08-28 — partly.** You sent the Google Maps link, so the site now
links to your Google listing from the Location page, the Contact page and the footer,
and the structured data carries `hasMap` plus the listing's coordinates (36.84967,
27.07574 — the village-centre pin Google already shows publicly).

Still no street address, and the map is a **link, not an embedded map** — an embed
would load Google code and a third-party cookie into a site that currently loads
nothing from anyone else, and would weaken the security policy for very little gain.

**Still to tell us.** Whether a street address should ever be published. Our
recommendation is no: the service is mobile, the pin and the Ghitonia landmark are
enough for someone to find and review you, and a street address on a home is not
worth the small local-search gain.

---

## 7. Payment method

**Current state.** The Terms say payment happens after the massage and that nothing
is paid online. It does not say cash, card or bank transfer, because we do not know.

**What to tell us.** What you actually accept. Tourists ask this constantly, and one
sentence in the FAQ will save you a lot of WhatsApp messages.

---

## 8. Testimonial attribution

**Current state.** 41 real comments, shown as first name plus city or country only.
Surnames removed. One commenter's professional title and business URL removed. Four
separate Jason & Wilma comments collapsed into one entry.

**What to tell us.** Whether you are comfortable publishing them at all. They are
genuine and they are your best sales material, but they were written on a site that
has been offline for years and none of those people expected to be quoted in nine
languages. If any single one should come out, say which and it is a one-line change.

---

## 9. Analytics

**Current state.** None. No Google Analytics, no tracking pixels, nothing. The cookie
banner says so plainly, and the privacy policy backs it up.

**What to tell us.** Whether you want visitor numbers. If you do, we would add a
privacy-respecting, cookieless tool rather than Google Analytics — it keeps the
cookie banner honest and does not need a consent flow.

---

## 10. Google Business Profile

**Current state — updated 2026-08-28.** It **is** set up. The Maps link you sent
resolves to a live Google Business Profile called "Mastichari Massage", so this item
is no longer about creating one.

**What is left to do on it.** Two things, both needing your own Google account:
claim/verify the listing if you have not already, and start asking happy customers to
leave a Google review there. That is where reviews actually count for search — the 41
comments on this website cannot be used by Google as ratings.

**Why it matters more than the website.** For "massage Kos" searches, a Google
Business Profile with real reviews outranks almost anything a website can do on its
own. The 41 comments on this site are good social proof for a visitor who is already
reading it, but they are not reviews Google can use — which is why the structured
data deliberately carries no `aggregateRating`.

See `docs/LAUNCH.md` for the post-launch steps.

---

## 11. Which Facebook page is the business one

**Current state.** You sent `facebook.com/profile.php?id=100054644702024`, and the
site now links to that one everywhere and names it as the business's page in the
structured data.

The old site linked a different, personal-looking profile
(`facebook.com/konstantinos.fessaras`). That one is still in our data file but is no
longer published anywhere.

**What to tell us.** Whether the old profile should be deleted from the site's data
for good, or whether both should be linked. Linking one clear business page is better
for search than linking two — Google reads these as "this is who the business is",
and two competing answers is weaker than one.
