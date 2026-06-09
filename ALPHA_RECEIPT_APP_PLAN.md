# Alpha Receipt Scanner App Plan

## Call

Use Receipt Wrangler as the base, not a from-scratch app.

Reason: it already has the hard pieces Alpha needs:

- Mobile receipt photo/scanner flow
- Web dashboard
- OCR receipt reading
- AI-assisted extraction
- Categories/tags
- Multi-user support
- Receipt upload/storage
- Export/filter foundation
- Self-hosted data control

Repository cloned locally:

```text
/home/toby/alpha-receipt-scanner
```

Source repo:

```text
https://github.com/Receipt-Wrangler/receipt-wrangler
```

License note: backend is AGPL-3.0. That is fine for internal Alpha use, but if Alpha ever sells this as SaaS or distributes modified versions, we need to handle AGPL obligations correctly.

## Alpha Use Case

When someone buys something for Alpha Construction Pros, they should be able to:

1. Open the mobile app.
2. Tap `Scan Receipt`.
3. Take a photo of the receipt.
4. App turns it into a stored receipt file / PDF-like record.
5. OCR reads vendor, date, total, tax, and line items when possible.
6. User assigns or confirms category:
   - Gas / Fuel
   - Food / Meals
   - Supplies
   - Materials
   - Tools / Equipment
   - Subcontractor / Labor Support
   - Office / Admin
   - Vehicle / Maintenance
   - Jobsite Misc
7. User assigns optional metadata:
   - Project/job name
   - Truck/vehicle
   - Employee who purchased
   - Payment method/card
   - Reimbursable yes/no
   - Notes
8. Receipt is saved into the right Alpha file bucket and monthly expense view.
9. Bookkeeping can export filtered receipts for tax/accounting.

## Best Product Shape

### Phase 1 — Internal Alpha scanner

Do this first. Simple and useful.

- Self-host Receipt Wrangler locally or on Alpha server/VPS.
- Set up users for Toby, Cassandra/bookkeeping, and field buyers.
- Configure categories for Alpha.
- Use mobile/web upload for every receipt.
- Store original receipt image and extracted metadata.
- Export monthly reports for bookkeeping.

### Phase 2 — Alpha-specific customizations

After Phase 1 is live, customize the app:

- Rename/brand to `Alpha Receipt Scanner`.
- Default category buttons: Gas, Food, Supplies, Materials.
- Add `Project / Job` field as first-class metadata.
- Add `Vehicle / Truck` field for fuel receipts.
- Add `Employee / Buyer` field.
- Add monthly PDF/CSV export by category/project.
- Add receipt filename convention:

```text
YYYY-MM-DD_VENDOR_TOTAL_CATEGORY_PROJECT.pdf
```

Example:

```text
2026-06-08_CASEYS_84.22_GAS_TRUCK-2.pdf
```

### Phase 3 — Accounting integration

Only after the scanner is stable:

- Export to CSV for QuickBooks/Zoho Books/bookkeeper.
- Optional email forwarding ingestion.
- Optional automated monthly bundle to Cassandra/bookkeeping.
- Optional AI rule engine:
  - Casey's / Loves / QuikTrip -> Gas
  - Home Depot / Lowe's / Menards -> Materials
  - Walmart / Dollar General -> Supplies unless manually changed

## Features to Build / Verify

### Must-have

- Mobile photo scanner works.
- OCR reads receipt text.
- Receipt image is retained.
- Categories exist.
- Search/filter by category/date/vendor.
- Multi-user upload works.
- Export or report path exists.

### Should-have

- PDF generation per receipt.
- Monthly PDF bundle.
- Monthly CSV export.
- Project/job custom field.
- Vehicle custom field.
- Reimbursement flag.

### Nice-to-have

- Push reminder if receipt upload is missing after card purchase.
- Text/email receipt upload.
- Auto-classification rules.
- Dashboard: fuel spend, materials spend, food spend, supplies spend.
- Tax-year archive folders.

## Build Notes From Verification

I cloned the upstream code into `/home/toby/alpha-receipt-scanner`.

Initial local system check:

- Docker exists.
- Git exists.
- Node exists.
- Local Go binary was not installed on host, so Docker build is the right verification path.
- Flutter command exists but local output was malformed/incomplete, so mobile verification may need Flutter SDK cleanup or Docker dev container.

The monolith Docker build starts correctly:

- Angular desktop build completed successfully inside Docker.
- Build then continued into the Go/API dependency install.
- The build is heavy because it pulls OCR/AI dependencies including PyTorch CPU wheels, ImageMagick, Tesseract-related dependencies, and Go base layers.

Current active verification path:

```bash
cd /home/toby/alpha-receipt-scanner
docker build -f docker/Dockerfile -t alpha-receipt-scanner:local .
```

## Recommended Implementation Decision

Do not start by writing a brand-new mobile app. That wastes time.

Start with Receipt Wrangler, get it running, then harden it for Alpha's actual workflow. The first real milestone is not custom UI — it is proving Toby/Cassandra/field users can scan receipts and produce usable bookkeeping records every month.

## Immediate Next Steps

1. Finish Docker build.
2. Run container locally.
3. Verify login/signup and dashboard loads.
4. Verify receipt upload/scanner route exists.
5. Configure Alpha categories.
6. Identify where custom fields/categories/export live in code.
7. Patch app branding and category defaults.
8. Build Android APK or mobile web/PWA route depending on fastest reliable path.
