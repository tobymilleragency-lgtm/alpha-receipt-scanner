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
size: 167773737 bytes
sha256: 3f56a27023e0b0d21e98188b3d1bf58d4a52a8db4fda1dffb96a830eefc08541
```

## Fixes applied

- Changed Android app label to `Alpha Receipt Scanner`.
- Allowed cleartext HTTP traffic so the phone can talk to the local LAN server at `http://192.168.12.209:18080` during testing.
- Set the app default home-server URL to `http://192.168.12.209:18080`.
- Removed the startup token-refresh loading gate from public routes so the installed app paints the login/home-server screen immediately instead of opening to a blank router frame.
- Added a boot smoke test that fails if first launch renders blank instead of the server URL screen.
- Added a visible router error fallback so bad route state shows an error screen instead of silently blanking.
- Set Android NDK to `28.2.13676358`, matching the scanner/integration-test dependency requirement.
- Added `build-mobile-apk.sh` so the APK can be rebuilt cleanly from Docker and copied to `dist/`.

## Local server for phone testing

The local web/API server is running at:

```text
http://127.0.0.1:18080/
```

For a phone on the same Wi-Fi, `127.0.0.1` will point to the phone itself, not Toby's workstation. Use the workstation LAN IP instead:

```text
http://192.168.12.209:18080
```

## Test login

```text
username: toby
password: alpha123
```

## Expected scanner location in the app

Once logged in on phone:

1. Tap the add / plus menu.
2. Use `Quick Scan` if receipt-processing/AI is enabled.
3. Or create/open a receipt and use `Upload from Camera`.

If `Quick Scan` is not visible, it is because the app only shows it when `aiPoweredReceipts` is enabled. The camera upload path still exists on receipt image/form screens.

## Build command

```bash
cd /home/toby/alpha-receipt-scanner
./build-mobile-apk.sh
```

The script uses Docker with persistent Flutter/Gradle caches under `/data/toby/ai-workbench/cache/` and copies the built APK to:

```text
/home/toby/alpha-receipt-scanner/dist/alpha-receipt-scanner-debug.apk
```
