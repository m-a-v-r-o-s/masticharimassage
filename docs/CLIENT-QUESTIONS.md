# Questions for Konstantinos

Everything the site could not decide on its own. Nothing here blocks a deploy —
each item has a safe default already in place, named below — but each one makes the
site better or more accurate once answered.

Ordered by how much it matters.

---

## 1. Face Massage and Cellulite Massage

**Current state.** Not on the site.

**Why.** They appeared only as dropdown options in the old (non-functional)
reservation widget. No page copy for them was ever written, so there was nothing to
recover and nothing to translate.

**What to tell us.** Do you still offer them? If yes, we need a couple of sentences
about each and they get full pages in all ten languages.

Note on the cellulite one: the old aromatherapy copy claimed the treatment
*"effectively reduces cellulite problems."* That line is not on the new site. It is a
cosmetic-efficacy claim with nothing to substantiate it, and on a health-adjacent
site in the EU it is the kind of sentence that causes trouble. If cellulite massage
comes back, it comes back described by what it feels like, not by what it cures.

---

## 2. Cancellation terms

**Current state.** The Terms page says there is no cancellation fee, and asks people
to tell you as early as they reasonably can.

**What to tell us.** If you want a real cancellation window — "24 hours' notice in
July and August" is common — say so and we will write it in. The current wording is
generous by default, which is the safe direction to be wrong in, but it is your call.

---

## 3. Street address and map

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
recommendation is no: the studio is your only premises now, and the pin plus the
Ghitonia landmark are already enough for someone to find and review you, so a street
address is not worth the small local-search gain.

---

## 4. Payment method

**Current state.** The Terms say payment happens after the massage and that nothing
is paid online. It does not say cash, card or bank transfer, because we do not know.

**What to tell us.** What you actually accept. Tourists ask this constantly, and one
sentence in the FAQ will save you a lot of WhatsApp messages.

---

## 5. Testimonial attribution

**Current state.** 41 real comments, shown as first name plus city or country only.
Surnames removed. One commenter's professional title and business URL removed. Four
separate Jason & Wilma comments collapsed into one entry. Three comments that
described a hotel-room visit (Salabi, Stefanie, Elena & Michael) have had that
clause trimmed, since the mobile service ended 2026-09-14 (see the open question
about this below).

**What to tell us.** Whether you are comfortable publishing them at all. They are
genuine and they are your best sales material, but they were written on a site that
has been offline for years and none of those people expected to be quoted in ten
languages. If any single one should come out, say which and it is a one-line change.

---

## 6. Analytics

**Current state.** None. No Google Analytics, no tracking pixels, nothing. The cookie
banner says so plainly, and the privacy policy backs it up.

**What to tell us.** Whether you want visitor numbers. If you do, we would add a
privacy-respecting, cookieless tool rather than Google Analytics — it keeps the
cookie banner honest and does not need a consent flow.

---

## 7. Google Business Profile

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

## 8. Which Facebook page is the business one

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

---

## 9. Duration range per massage

**Current state.** You told us sessions run 30 to 90 minutes, and the site now shows
that range for every massage on the list.

**What to tell us.** Is that really true for all eight, or does something like the
foot massage or Indian head massage run shorter in practice? If any massage has its
own range, tell us and we will set it individually instead of the blanket 30-90.

---

## 10. Frozen shoulder treatment, in your own words

**Current state.** The page describes the session carefully but generically: gentle,
gradual work on the shoulder, upper back and neck, within a comfortable range of
movement, with a note that it is not a cure and a doctor's diagnosis should come
first.

**What to tell us.** Two or three sentences in your own words about how you actually
work on a frozen shoulder: what you focus on, what you avoid, anything you tell
clients before starting. We will fold that in without changing the health-claim
posture (no promise to cure it or restore movement).

---

## 11. Testimonials that mention a hotel visit

**Current state.** Three real comments (Salabi, Stefanie, Elena & Michael) described
Konstantinos travelling to a hotel room. Since that service ended 2026-09-14, we
trimmed just the hotel-visit clause from each and kept the rest, using the same
`abridged` mechanism already used elsewhere.

**What to tell us.** Whether that is the right call, or whether any of the three
should be removed from the site entirely instead. The default is to keep them
abridged, since the rest of each comment is still a genuine, relevant compliment.
