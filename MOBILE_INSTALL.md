# Alpha Receipt Scanner Mobile Install

## What happened

The browser/web dashboard does not show the phone scanner. The receipt scanner is in the Flutter mobile app, not the desktop web dashboard.

The mobile app has these scanner entry points in code:

- `mobile/lib/shared/functions/show_add_menu.dart` — Add menu shows `Quick Scan` when AI-powered receipts are enabled.
- `mobile/lib/utils/scan.dart` — uses `cunning_document_scanner` to open the phone document scanner/camera.
- `mobile/lib/receipts/nav/receipt_app_bar_action_builder.dart` — receipt form menu has `Upload from Camera` and `Upload from Gallery`.
- `mobile/lib/receipts/widgets/receipt_image_app_bar.dart` — receipt image screen has `Upload from Camera` and `Upload from Gallery`.

## Built APK

A debug Android APK was built successfully here:

```text
/home/toby/alpha-receipt-scanner/dist/alpha-receipt-scanner-debug.apk
```

Source build output:

```text
/home/toby/alpha-receipt-scanner/mobile/build/app/outputs/flutter-apk/app-debug.apk
```

Build verification:

```text
size: 167776497 bytes
sha256: c69458f57794efca9fd982b60fe39788f87610b1793701e13b8c858dbf6cce13
```

## Fixes applied

- Changed Android app label to `Alpha Receipt Scanner`.
- Set the app default home-server URL to the public HTTPS backend at `https://methodology-discs-lenders-charleston.trycloudflare.com` so the scanner works off Wi-Fi / on cellular.
- Added stale-local-URL migration: saved `127.0.0.1`, `localhost`, `192.168.x.x`, `10.x.x.x`, and private `172.16-31.x.x` server URLs are ignored and replaced with the public backend.
- Removed the startup token-refresh loading gate from public routes so the installed app paints the login/home-server screen immediately instead of opening to a blank router frame.
- Added a boot smoke test that fails if first launch renders blank instead of the server URL screen.
- Added a visible router error fallback so bad route state shows an error screen instead of silently blanking.
- Made `Scan Receipt` the first Add-menu action and allowed it to save receipt photos even when AI receipt processing is not configured.
- Set Android NDK to `28.2.13676358`, matching the scanner/integration-test dependency requirement.
- Added `build-mobile-apk.sh` so the APK can be rebuilt cleanly from Docker and copied to `dist/`.

## Public server for phone testing

The mobile app now defaults to this public HTTPS backend:

```text
https://methodology-discs-lenders-charleston.trycloudflare.com
```

## Test login

```text
username: toby
password: alpha123
```

## Expected scanner location in the app

Once logged in on phone:

1. Tap the add / plus menu.
2. Tap `Scan Receipt`.
3. Take the receipt photo and submit it. If AI receipt processing is configured, it queues for AI extraction; otherwise it saves a normal receipt with the scanned image attached.

## Build command

```bash
cd /home/toby/alpha-receipt-scanner
./build-mobile-apk.sh
```

The script uses Docker with persistent Flutter/Gradle caches under `/data/toby/ai-workbench/cache/` and copies the built APK to:

```text
/home/toby/alpha-receipt-scanner/dist/alpha-receipt-scanner-debug.apk
```
