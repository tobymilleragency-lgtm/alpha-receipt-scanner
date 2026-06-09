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
/home/toby/alpha-receipt-scanner/mobile/build/app/outputs/flutter-apk/app-debug.apk
```

Build verification:

```text
size: 164608721 bytes
sha256: 7d7cf92192f824d47891949ceef71056c7177542433024b2b6bc1910ea7619a2
```

## Local server for phone testing

The local web/API server is running at:

```text
http://127.0.0.1:18080/
```

For a phone on the same Wi-Fi, `127.0.0.1` will point to the phone itself, not Toby's workstation. Use the workstation LAN IP instead.

Get LAN IP:

```bash
hostname -I
```

Then in the mobile app home-server field, use:

```text
http://<WORKSTATION_LAN_IP>:18080
```

Example:

```text
http://192.168.1.50:18080
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

## Build command used

```bash
docker run --rm \
  -v /home/toby/alpha-receipt-scanner/mobile:/work \
  -w /work \
  ghcr.io/cirruslabs/flutter:stable \
  bash -lc 'flutter pub get && flutter build apk --debug'
```
