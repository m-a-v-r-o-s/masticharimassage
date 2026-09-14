# Handoff: studio-only, new slogan, frozen shoulder, languages, no prices

Client instructions received 2026-09-14. This file is the full work plan. Delete it in
the final commit once every item is done.

## What changed in the business

1. **No more hotel visits.** Konstantinos now works only at his own massage room in
   Mastichari: same place as before, the one next to Ghitonia, same Google pin. He does
   not travel to hotels, apartments or villas any more. This is the biggest change,
   because "I come to you" runs through almost every page in all ten locales (about 25
   mentions per locale). Be thorough.
2. **New hero slogan** (Greek source, from the client):
   `Το κάθε σώμα αναζητάει το δικό του μασάζ, στο Μαστιχάρι το βρίσκει.`
   (The client wrote "μασαζ" without the accent. Use "μασάζ".)
3. **New service: frozen shoulder treatment.**
4. **Languages:** he also speaks French, German and Russian, so the full list is Greek,
   English, Italian, French, German and Russian.
5. **Text from the masseur, shown above the list of massages on the services page:**
   `Το κάθε σώμα είναι διαφορετικό άρα και το μασάζ διαφέρει. Συνήθως είναι μια μίξη από χαλαρωτικό, σουηδικό, θεραπευτικό, αθλητικό, deep tissue massage και Thai μασάζ. Ξεκινάει από 30 μέχρι 90 λεπτά.`
   (The client wrote "Tai" and put in double spaces. Both are fixed above.)
6. **Prices will never be on the website.** This is now permanent, not "pending".

## Ground rules (from README, still binding)

- Copy lives only in `content/<locale>/site.json`, in all ten locales (en is the i18n
  reference: `scripts/i18n-check.js` `REF = "en"`). Greek is the client's own voice, so
  write Greek and English first, then translate into de, fr, it, ru, nl, pl, es, uk.
- No inline styles or scripts (CSP). No em dashes in anything written.
- Never `git push`. Commit only, as `m-a-v-r-o-s` (already the configured identity),
  with no AI attribution in the message.
- Dev server: use `PORT=3001` (the server reads `process.env.PORT`). Never touch 3000.
- Gates: `npm run check`, `npm run build`, `npm run audit` must all be green at the end.

---

## 1. Studio only (remove every trace of the travelling service)

### Data and code

- `content/_business.json`
  - `venues`: delete `mobile`. Make `studio` the only venue (`primary: true`) and
    rewrite its `_note` ("only venue since 2026-09-14, no outcalls").
  - Delete the whole `hotelPartners` block.
  - `map._note`: remove "The service is mobile (he travels to the guest)".
  - `areaServed`: keep `["Mastichari", "Tigaki", "Marmari", "Kos"]`. It is still true,
    because guests staying in those villages drive to the studio, and it keeps the local
    search signal. The copy must frame those villages as "where clients come from",
    never as "where I go".
- `src/pages/location.njk`: delete the hotels section (`hotelsTitle`, the
  `hotelPartners` branch). Rework the "areas" cards into "coming from Mastichari /
  Tigaki / Marmari" (how far away, where to park). Replace the `balcony-setup` image
  (a table on a sea-view balcony, which shows exactly the service that has ended) with
  `hero-treatment-room` or a session photo. Then remove `balcony-setup` from the
  required list in `scripts/i18n-check.js:144` and from the fallback in
  `scripts/build-icons.js:135` (point it at `og-base` or `hero-treatment-room`).
- **Booking form "where" field: remove it end to end.** It only exists to ask which
  hotel.
  - `src/pages/contact.njk:50` and `:90-94` (markup and error string map)
  - `src/assets/js/site.js:250,260` (client validation)
  - `server/index.js:150,162,173` (limit, clean, required check). This is the trust
    boundary, so the server must stop requiring it. Otherwise every real submission
    fails validation.
  - `server/mailer.js:13,19` (subject line and row)
  - Copy keys in all locales: `contact.form.where`, `contact.form.whereHint`,
    `contact.errors.where`
  - Privacy policy (`privacy` section): drop "where you would like the massage to take
    place" from the list of data received.
- `scripts/build-icons.js:114`: the manifest description says "Massage in your hotel
  room". Rewrite it and re-run `npm run icons`.
- `src/_includes/partials/jsonld.njk` header comment: rewrite the "works both ways"
  paragraph.
- `README.md` line 3 ("a mobile massage therapist") and `docs/CLIENT-QUESTIONS.md`:
  close item 3 (hotel partners, obsolete), item 2 (prices, answered: never) and item 1
  (German, answered: yes). Item 6 argues against a street address because "the service
  is mobile", so rewrite that reasoning and leave the question open.

### Copy (every locale). Greek keys that currently mention travel or hotels:

| Section | Keys |
|---|---|
| `meta` | home title and description ("στο ξενοδοχείο σας"), services description, location description, contact description, all `meta.services.*.description` (every one says "or at your hotel") |
| `ui` | `priceNote` ("travel time is accounted for"), `areaLabel` ("coverage area") |
| `home` | `heroKicker` (see section 2), `heroLede`, `heroBadge` (see section 4), `introTitle` ("one therapist, two ways"), `introBody`, `points[0]`, `areaTitle`, `areaBody`, `ctaBody`; check `howSteps` too |
| `about` | `bio[1]`, `bio[2]` (hotel partnerships; "if I'm not there the family will say where I am") |
| `services` | `lede` ("seven treatments... or where you are staying"), `pricingBody` |
| `location` | `title`, `lede`, `areasTitle` ("areas I travel to"), `areas[]`, `elsewhereTitle`, `elsewhereBody`, `practicalTitle`, `practicalBody` (reframe as "when you arrive"), `hoursBody`, `imageAlt`; delete `hotelsTitle`, `hotelsBodyGeneric`, `hotelsBodyNamed` |
| `contact` | `formIntro`, FAQ "do you come to me or do I come to you", FAQ "can I walk in" ("often out on appointments"), FAQ about areas; check `success` and `thankyou` |
| `terms` | venue section ("or at your hotel room, apartment or villa", "you are responsible that I'm allowed at your accommodation", "some hotels restrict outside therapists"); cancellation "travel problem" |
| `nav` | `location` is "Where I work" / "Πού δουλεύω", which is fine; keep it |

The table is the Greek and English inventory. The other locales have the same keys
but the wording differs, so do not trust it blindly there. **Sweep check before
committing**, which must return nothing about outcalls in any locale (read each hit,
some are legitimate, e.g. "Where to find me"):

```bash
grep -rniE "hotel|hôtel|albergo|отел|готел|hotelu|ξενοδοχ|κατάλυμ|διαμέρισ|βίλα|villa|apartment|appartement|appartamento|wohnung|unterkunft|zimmer|номер|квартир|apartament|apartamento|balcon|balkon|μπαλκόν|reception|ρεσεψιόν|rezeption|réception|travel|μετακιν|come to you|έρχομαι εγώ" content/*/site.json
```

### Testimonials

Three real quotes describe an in-room visit: `salabi` (fr, "Il s'est déplacé à notre
hôtel"), `stefanie` (de, "Er bringt seine Liege mit aufs Zimmer"), `elena-michael`
(ru, "приходил к нам в номер отеля", already `abridged` for another reason). None of
them is in the home page's picks (`home.njk:141`). Default: keep them and use the
existing `abridged` + `abridgedReason` mechanism to cut only the hotel-visit clause, in
the original and in every `t` translation. That is the precedent already set for
Elena & Michael, whose quote was cut because it read as a service promise. Record
the reason as "describes the in-room service, discontinued 2026-09-14".

## 2. Hero slogan

`home.heroTitle` / `home.heroTitleAccent` render as one `<h1>`, with `*word*` passed
through the `stress` filter for the accent. Greek:

- `heroTitle`: `Το κάθε σώμα αναζητάει το δικό του μασάζ,`
- `heroTitleAccent`: `στο *Μαστιχάρι* το βρίσκει.`

Translate idiomatically per locale (keep the "every body looks for its own massage /
finds it in Mastichari" turn; keep "Mastichari" as the stressed word).

`heroKicker` must keep the `"<places> - <island>"` shape (`home.njk` splits on " - "),
e.g. `Μαστιχάρι - Κως`.

The last commit (`f1bc479`) deliberately shortened the headline, and this one is
longer. Screenshot the hero at 390px, 768px and 1440px, and retune `.hero__title` size
in `main.css` if it wraps into more than 4 lines on mobile or pushes the CTA below the
fold.

## 3. New service: frozen shoulder treatment

- Slug: `frozen-shoulder-treatment`. Add it to `content/_business.json` `services` with
  `featured: false` and `order: 4` (right after therapeutic-sports), and renumber the
  entries after it. Pages, sitemap, JSON-LD `Service`, the form's service dropdown and
  the server allowlist (`SERVICE_SLUGS`) all derive from this list. Confirm the
  dropdown and allowlist pick it up.
- All ten locales: `serviceContent.frozen-shoulder-treatment` with `name`, `short`,
  `lede`, `body[]`, `goodFor[]`, `imageAlt` (same shape as
  `therapeutic-sports-massage`), plus `meta.services.frozen-shoulder-treatment` title
  and description.
- Names: EN "Frozen shoulder treatment", EL "Θεραπεία παγωμένου ώμου".
- **Health-claim posture (existing site rule, see CLIENT-QUESTIONS item 4 and
  `ui.wellnessNotice`):** describe what the session is (gentle, gradual work on the
  shoulder, upper back and neck muscles; pressure agreed and adjusted; within a
  comfortable range of movement). Never promise to cure it, to restore range of motion,
  or to shorten recovery. Say that frozen shoulder should be diagnosed by a doctor
  first. There is no certificate for this specific technique in
  `credentials`, so do not claim special training for it (the sciatica/back seminars
  are separate and must not be stretched to cover it).
- Image: copy the real photo `src/assets/img/_src/session-shoulders-closeup.webp` to
  `service-frozen-shoulder-treatment.webp` (genuine photograph of shoulder work, fits
  exactly), then `npm run images`. Base the alt text on `home.heroImageAlt2`.
- Update every sentence that counts or lists the massages: `services.lede` ("seven"),
  `meta.services` description (the list of all massages), any FAQ that counts them.

## 4. Languages: el, en, it, fr, de, ru

- `content/_business.json` `person.knowsLanguage`: `["el", "en", "it", "fr", "de", "ru"]`.
- `scripts/audit.js:106-107` hardcodes `["el","en","it"]`. Update it to the new list
  (keep the guard; its job is to stop anyone deriving the list from the site's
  locales).
- `jsonld.njk` comment and `README.md` "knowsLanguage is Greek, English and Italian"
  section.
- Copy: `home.heroBadge`, `about.languagesBody`, `contact.faq` "what languages" answer.
  The current wording says consultation happens only in el/en/it. Rewrite it to list
  all six. Nl, pl, es and uk readers still need the "the site is in more languages than
  I speak" line.
- Also check the `docs/CLIENT-QUESTIONS.md` item 1 testimonial note ("Elena & Michael's
  list of languages was cut"). That clause was cut because it overclaimed, and it is now
  mostly true. Leave the abridgement as it is (see section 1), just correct the doc.

## 5. Masseur's text above the massage list

- New key `services.mixNote` (all locales) rendered in `src/pages/services.njk` between
  the `section-head` and the `grid`. It is his own words, so style it as a short quote
  or intro paragraph using existing classes (look at `quotes.njk` / `.lede` /
  `.notice` before writing new CSS).
- It says sessions run **30 to 90 minutes**, which contradicts the current data
  (`durations: [45]` on most services, `[45, 60, 90]` on full body) and the
  `services.lede` ("normally 45 minutes"). Default: set every service's `durations` to
  `[30, 90]` and render it as a range (`{{ d | first }}-{{ d | last }}`) in
  `services.njk:29` and `service.njk:27`, and drop the duration sentence from
  `services.lede`. Add a question to `CLIENT-QUESTIONS.md` asking whether any massage
  (foot, head) has a different range.
- Keep "Thai" in the text. The site's credential is Thai *oil* massage, and this
  sentence is his description of the mix, not a credential claim, so do not add a Thai
  massage service.

## 6. Prices: never

- `content/_business.json` `prices`: keep `published: false`, and rewrite `_note` to
  say the client confirmed on 2026-09-14 that prices will never be published.
- Remove the "set published true and Offer switches on" guidance from
  `CLIENT-QUESTIONS.md` item 2 and `README.md`.
- Tighten the guard: `scripts/i18n-check.js:72` and `scripts/audit.js:116` only catch
  29/39/59. Change both to any amount (`/\d+\s?(€|EUR|euro)|€\s?\d+/i`) and run the
  gates to confirm there are no false positives in the legal copy.
- Keep `ui.priceOnRequest` and the "prices are given when you get in touch" copy, but
  remove "travel time" from it (section 1).

## 7. Housekeeping

- Page count goes from 145 to 155 (10 locales x 1 new service page). Update
  `README.md`, `scripts/audit.js:4` and `docs/LAUNCH.md`. Those docs also still say
  "nine languages" although ten locales exist, so fix that while you are there.
- Leave the server redirects alone; the old `/mastichari/mastichari-tigaki-massage` URL
  still maps sensibly to `/location/`.

## Verification (do all of it, report results honestly)

1. `npm run check && npm run build && npm run audit`: all green.
2. The sweep grep in section 1 is clean.
3. `PORT=3001 npm run serve`, then with Playwright:
   - Hero at 390 / 768 / 1440 in el and en: slogan fits, CTA visible.
   - `/el/services/`: the mixNote shows above the cards, eight cards, ranges read "30-90".
   - `/en/services/frozen-shoulder-treatment/` renders with the real photo.
   - `/el/location/`: no hotel section, no balcony photo.
   - Contact form: no "where" field; submitting without one gets past validation
     (a JSON POST that fails only on the token/mail step, not with `errors.where`).
   - View the JSON-LD on one page: `knowsLanguage` has six codes, no `Offer`, the
     new `Service` node is present on the new page.
4. Commit in logical chunks (e.g. studio-only copy and form; new service; languages;
   hero and mixNote; price guard), each scoped to its own files. No push.

## Open questions to add to CLIENT-QUESTIONS.md (defaults already applied above)

- Duration range per massage: is it really 30-90 for all of them?
- Frozen shoulder: two or three sentences in his own words about how he works on it.
- Testimonials that mention hotel visits: fine to show abridged, or remove?
