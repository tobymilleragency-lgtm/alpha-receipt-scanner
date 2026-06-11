import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:receipt_wrangler_mobile/persistence/global_shared_preferences.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:receipt_wrangler_mobile/main.dart';

void main() {
  testWidgets(
      'first launch renders the server URL screen instead of a blank app',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    await GlobalSharedPreferences.initialize();

    await tester.pumpWidget(buildApp());
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pumpAndSettle(const Duration(seconds: 2));

    expect(find.byType(MaterialApp), findsOneWidget);
    expect(find.text('Connect to Server'), findsOneWidget);
    expect(find.text('Server URL'), findsOneWidget);
    expect(find.text('Connect'), findsOneWidget);
  });
}
