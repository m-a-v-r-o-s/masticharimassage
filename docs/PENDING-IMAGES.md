# Illustrations still to generate

Four of the sixteen illustrations were not produced: the Hugging Face ZeroGPU free
quota ran out partway through the run. Everything else is done — the four genuine
photographs are processed, and twelve of the sixteen generated images are in place.

The site does **not** look broken in the meantime. `src/_includes/partials/pic.njk`
falls back to `hero-treatment-room` and uses `ui.imagePendingAlt` ("A quiet
treatment setting: clean linen, folded towels and oil, ready for a session"), which
honestly describes the stand-in rather than the photo it replaces. `npm run check`
reports the gap on every build so it cannot be forgotten.

## How to finish it

Generate each image below with the exact prompt and seed, save the result to
`src/assets/img/_src/<key>.webp`, then:

```bash
npm run images     # rebuilds the AVIF/WebP/JPEG ladder + content/_images.json
npm run icons      # rebuilds the OG card once og-base.webp exists
npm run build
npm run audit
```

The shared style suffix is already baked into each prompt. Model: Z-Image-Turbo,
10 steps. Keep the seeds — they are what makes the set look like one shoot.

---

### 1. `service-indian-head-massage.webp` — 1536x1024 (3:2), seed 7315

> A simple wooden chair with a clean folded white towel draped over its back, placed
> beside an open window with a light linen curtain, in a whitewashed Greek island
> room. A small side table with a bowl of oil. Warm afternoon light falling across
> the pale plaster wall, soft shadows. Editorial wellness photography, warm neutral
> palette of cream, oatmeal and weathered teal wood, shallow depth of field, 50mm
> lens, calm and uncluttered. Absolutely no people, no faces, no bodies, no hands,
> no skin, no text, no lettering, no logos, no watermark.

Existing alt text (already written in all nine locales, `serviceContent.indian-head-massage.imageAlt`):
"A simple wooden chair with a folded towel over the back, set up by an open window
for a seated head massage."

### 2. `service-foot-massage.webp` — 1536x1024 (3:2), seed 7316

> Still life at the foot end of a massage table: a small round cushion wrapped in a
> clean white towel, a shallow ceramic bowl of warm water with a sprig of mint
> floating in it, and a folded oatmeal linen cloth, arranged on cream linen. Soft
> warm daylight from the side, gentle steam, quiet shadows. Editorial wellness
> photography, warm neutral palette of cream, oatmeal and weathered teal ceramic,
> terracotta accents, shallow depth of field, 50mm lens, calm and uncluttered.
> Absolutely no people, no faces, no bodies, no feet, no hands, no skin, no text,
> no lettering, no logos, no watermark.

Alt text already written: "A towel-wrapped cushion at the end of a massage table,
with a bowl of warm water beside it."

### 3. `service-aromatherapy.webp` — 1536x1024 (3:2), seed 7317

> A calm aromatherapy scene on a pale weathered wooden shelf: three amber glass
> bottles of essential oil, a small shallow ceramic dish holding dried lavender, a
> sprig of fresh rosemary and a dried olive branch, an unlit beeswax candle in a
> terracotta holder, a folded oatmeal linen cloth. Soft warm side light from a
> window, long gentle shadows on a whitewashed wall. Editorial wellness
> photography, warm neutral palette of cream, amber and sage, shallow depth of
> field, 85mm lens, calm and uncluttered. Absolutely no people, no faces, no hands,
> no skin, no text, no lettering, no labels, no logos, no watermark.

Alt text already written: "Amber dropper bottles of essential oil, dried lavender
and a sprig of rosemary on a wooden shelf."

### 4. `og-base.webp` — 1536x864 (16:9), seed 7318

The Open Graph card currently uses `balcony-setup` as its base, which works and
looks good — this is an improvement, not a fix. The composition below leaves clear
sky and sea on the right so the wordmark has room to breathe.

> Wide cinematic view of a professional massage table made up with cream linen,
> standing on a shaded terrace of a whitewashed Greek island house, looking out over
> a calm turquoise Aegean sea in warm late-afternoon light. A folded towel and a
> small amber bottle of oil on the table, terracotta pots and a bougainvillea at the
> edge of frame, generous empty sky and sea on the right side of the composition.
> Editorial travel and wellness photography, warm neutral palette of cream, oatmeal
> linen, weathered teal and terracotta, shallow depth of field, 35mm lens, calm and
> uncluttered. Absolutely no people, no faces, no bodies, no hands, no text, no
> lettering, no logos, no watermark.

`scripts/build-icons.js` picks up `og-base.webp` automatically if it is present and
falls back to `balcony-setup.webp` if it is not.

---

## Rules that applied to the whole set

Kept here because they are the reason the prompts read the way they do, and any
replacement image has to satisfy them too:

- **No recognisable person, ever.** The four `fessaras-banner*.jpg` photographs
  recovered from the old site show an identifiable client, face visible, bare back,
  with no model release. They were discarded and must not be reintroduced.
- **No bare torsos or backs.** Empty setups and still lifes only. This is a solo
  male mobile masseur's website; the imagery has to read as unambiguously clinical
  and calm in every one of the nine markets it is published in.
- **No text in frame.** Generated lettering is always wrong, and on a health-adjacent
  site a garbled word on a certificate-looking object is worse than no image.
- **Disclosed.** The footer of every page states that the illustrative photography is
  AI-generated while the portrait and the certificates are genuine
  (`ui.imageNote`), and the privacy page repeats it.
