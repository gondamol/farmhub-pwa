# FarmHub Roadmap: from pilot to production

This document compares FarmHub with established livestock-management products, sets out what "production-ready" means for a Kenyan smallholder service, and lays out a phased plan that can be taken to funders.

*Prepared September 2026. Competitor prices and grant details come from public listings and should be re-checked before they are quoted in any application.*

---

## 1. Where FarmHub stands today

**Strengths**
- Works fully offline and installs from the browser. There is no app-store dependency, and it runs on low-cost Android phones.
- Content is already localised: PPR/CCPP vaccines, FAMACHA scoring, KES, local breeds.
- A 5-year herd and cash-flow projection is unusual for smallholder tools and useful for loan and investor conversations.
- No per-device cost and no server to run, so each pilot farmer costs close to nothing.

**Gaps before paying customers or a funded pilot**

| Gap | Why it matters |
|---|---|
| Data lives only on one phone | A lost or reset phone wipes the records. That is the single biggest trust risk. |
| No accounts, roles or multi-farm view | Cooperatives, NGOs and extension officers (the likely paying customers) can't see aggregate data |
| Vaccination, deworming and kidding pages are placeholders | Core health workflows are incomplete |
| No milk recording or growth analytics | These are standard in every competitor (below) |
| English only | Swahili is essential for adoption beyond early adopters |
| No automated tests, CI or error monitoring | Regressions reach farmers unnoticed |
| Veterinary text has not been reviewed by a vet | Safety and liability risk (one dewormer note was already found to be wrong and fixed) |
| No privacy policy or consent flow | Required under the Kenya Data Protection Act, 2019 once data leaves the device |

---

## 2. What comparable tools offer

The table covers established US/EU products, which set the feature bar, and Kenyan tools, which show what already works locally.

| Product | Market | Price (public listing) | Standout capabilities |
|---|---|---|---|
| **Farmbrite** | US, multi-species | $19–95 / month | Livestock + crops, 100+ reports, milk yield with fat/protein, inventory, online store and POS |
| **FarmKeep** | US, homestead | Free tier; from $9.99 / month | Native apps, vaccination/deworming reminders, gestation and kidding prediction, pedigree, per-goat milk, weights, multi-user |
| **EasyKeeper** | US, goat breeders | ~$19 / month | Dairy-goat focus: milk tests, pedigrees, herd reports |
| **Herdwatch** | IE/UK | ~€79 / year | Offline data entry that syncs later, quick-action treatment logging, compliance reports, EID tag readers |
| **CattleMax** | US, cattle | from ~$199 / year | Deep breeding records and genetics (EPDs) |
| **farmOS** | Global, open source | Free / self-hosted | Open data model and API, community modules |
| **iCow / DigiCow** | Kenya, dairy cattle | Freemium, SMS | Proven local model: SMS/USSD tips, breeding calendars, records, vet access |

### Features worth adopting

We adopt the *capabilities and workflows* these products have proven useful. We do not copy their code, designs or branding.

1. **Quick-action treatment logging** (Herdwatch): record a treatment for one goat or a batch in two taps, even offline.
2. **Kidding prediction and a breeding calendar** (FarmKeep, CattleMax): FarmHub already calculates the due date; it still needs a calendar view, pre-kidding reminders and kid survival tracking.
3. **Milk recording per doe** (Farmbrite, EasyKeeper): daily litres, with ranking of the best producers.
4. **Growth tracking** (all): weight charts and average daily gain, with sale-readiness targets for meat goats.
5. **Pedigree view** (FarmKeep, EasyKeeper): dam/sire tree to avoid inbreeding. The data is already captured.
6. **Inventory with withdrawal periods** (Farmbrite): feed and drug stock, with milk and meat withdrawal warnings after treatment.
7. **Reports** (Farmbrite, Herdwatch): herd register, health history and profit & loss as printable or PDF documents, for lenders, buyers and cooperatives.
8. **Multi-user roles** (FarmKeep): owner, farm hand and vet/extension officer.
9. **Open data export/API** (farmOS): lets partners (insurers, researchers, county government) integrate.

---

## 3. Kenya-specific differentiators

These are what make FarmHub fundable rather than just another US-style tool:

- **Goats, not dairy cattle.** Kenyan digital livestock tools concentrate on dairy cows (iCow, DigiCow). Small ruminants are underserved, even though goats are a major asset for pastoralist and smallholder households, and particularly for women.
- **M-Pesa** (Safaricom Daraja API) for subscriptions and to record sales and purchases automatically.
- **SMS and USSD reminders** (e.g. Africa's Talking) for farmers on feature phones or without data bundles. The PWA remains the rich client for the farmer, cooperative lead or extension officer who has a smartphone.
- **Swahili first**, with room for local languages such as Somali and Maa in pastoral counties.
- **Low data and low-end devices:** offline-first is already done. The next steps are to keep the initial download small, compress photos (already implemented in `photos.js`) and sync in the background.
- **The extension officer and cooperative as the channel:** one officer or cooperative lead manages many farmers. This is the most realistic route to scale and to revenue.
- **Records as a financial identity:** with farmer consent, verified herd and health history can support credit scoring, livestock insurance and buyer contracts.
- **Government alignment:** Kenya's 2026 Agricultural Data, Information and Digital Policy and the KIAMIS farmer registry create a route to county adoption and data interoperability.

---

## 4. Production plan

### Phase 0: Hardening (done in this pass)
- Service worker caches every script, icon and web font; relative paths allow hosting under a subpath; cache version bumped.
- HTML-escaping for all user-entered and imported text (prevents script injection through goat names, notes or malicious backup files).
- Database v2 migration: added the missing `dewormings.goatId` index, which had made every goat detail page fail. Reference IDs are normalised, which fixes vaccination history not appearing and "Goat not found" after editing or vaccinating a goat from its own page.
- Corrected unsafe albendazole guidance ("safe during pregnancy") for both new and existing installs.

### Phase 1: Pilot-ready app (≈ 6–8 weeks, 1–2 developers)
- Finish the vaccination, deworming and kidding pages; add health events (illness, treatment, death, with cause).
- Milk recording, weight charts and average daily gain, pedigree view.
- Wire up photo upload on goat profiles.
- Swahili translation (i18n layer) and a vet review of all guides and seeded drug information.
- Local notifications for due vaccinations and kiddings; weekly "back up your data" prompt.
- Automated browser tests (Playwright) and CI on every push; error reporting.
- Host on Cloudflare Pages with a custom domain.
- **Pilot:** 50–100 farmers through 1–2 cooperatives, with a baseline survey.

### Phase 2: Accounts and cloud (≈ 8–10 weeks)
- Phone-number login (SMS one-time password).
- Cloud sync: Cloudflare Workers + D1, matching the existing `sync.js` design, with per-record conflict handling rather than whole-store "server wins".
- Multi-user farms and roles; encrypted backups; account recovery.
- Privacy policy, consent screens, ODPC registration and a data-sharing agreement template.
- M-Pesa subscription billing.

### Phase 3: Scale and ecosystem (≈ 3–6 months)
- Cooperative, NGO and county dashboard: herd health, vaccination coverage, disease alerts by area.
- SMS/USSD reminders and data entry for feature-phone users.
- PDF reports for lenders and buyers; consented data sharing with insurers and lenders.
- Market price feed and buyer linkage.
- Optional: Bluetooth EID/RFID tag readers for larger herds.

---

## 5. Business model

| Segment | Offer | Indicative price |
|---|---|---|
| Smallholder (≤ 20 goats) | Free forever: records, reminders, offline | Free (funded by grants and partners) |
| Commercial farm | Cloud backup, multi-user, milk and growth analytics, reports | Small monthly M-Pesa subscription (price to be validated in pilot) |
| Cooperative / NGO / county | Dashboard, bulk onboarding, training, data export | Annual licence per farmer group |
| Financial partners | Consented, verified herd data for credit and insurance | Per-report or revenue share |

Keeping smallholders free protects the social-impact case funders look for. The revenue comes from institutions and commercial farms.

---

## 6. Impact metrics for funders

Measure from the first pilot, with a baseline survey before onboarding:

- Active farmers (weekly/monthly) and records logged per farmer
- Vaccination coverage (% of herd current on PPR and CCPP)
- Kid survival to weaning
- Herd growth and goat sales income per household
- Share of women-owned farms among users
- Farmers who obtained credit or insurance using FarmHub records (Phase 3)

---

## 7. Funding leads

Confirm eligibility and deadlines at the source before applying. These were found through aggregator sites.

| Program | Amount | Notes |
|---|---|---|
| IFC Agritech Modernization Grant | $100k–2.5M | Digital tools for smallholder incomes in Sub-Saharan Africa; listed deadline **10 Oct 2026**. Needs "proven smallholder linkages", so a cooperative partner letter strengthens it |
| AI4Good AgriTech Farmer Solutions (Moonshots for Development) | up to $360k | Digital advisory for smallholders; the listed 30 Mar 2026 deadline has passed, so watch for the next round |
| AgriTech Change-Makers Cohort 2026 (Kenya) | Accelerator | Kenyan agritech startups |
| Kenya digital-agriculture policy financing | County budgets, PPPs, donor grants | Route for county-level adoption |

**Suggested application package:** a working demo URL, this roadmap, 1–2 cooperative partnership letters, pilot budget (developer time, vet review, Swahili translation, field officer stipends, SMS costs) and the impact metrics above.

---

### Sources
- [Livestock software comparison (Mind the Farm)](https://mindthefarm.com/compare)
- [FarmKeep goat management](https://www.farmkeep.com/farm-type/goat-management)
- [Herdwatch pricing (Capterra)](https://www.capterra.com/p/171787/Herdwatch/)
- [DigiCow Dairy App (FAO)](https://sti-portal.fao.org/innovations/digicow-dairy-app)
- [Kenya's farmers and digital tools (The Conversation)](https://theconversation.com/kenyas-farmers-have-lots-of-digital-tools-to-help-boost-productivity-how-they-can-be-made-more-effective-246690)
- [Kenya digital agriculture policy (HapaKenya)](https://hapakenya.com/2026/03/10/kenya-launches-policy-to-digitize-agriculture-secure-food-future/)
- [IFC Agritech Modernization Grant (NextBillion)](https://nextbillion.net/business-development/agritech-modernization-grant/)
- [AI4Good AgriTech (ICTworks)](https://www.ictworks.org/ai4good-agritech-farmer-solutions/)
- [AgriTech Change-Makers Cohort 2026](https://www.entrepreneurscatalysthub.com/funding-opportunities/agritech-change-makers-cohort-2026-kenya/)
