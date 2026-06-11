import 'package:flutter/material.dart';
import 'package:receipt_wrangler_mobile/services/token_refresh_service.dart';

Future<String?> protectedRouteRedirect(
    BuildContext _, String? redirect) async {
  var tokensValid = await TokenRefreshService().refreshTokens();
  var redirectRoute = redirect ?? "/";

  if (tokensValid) {
    return null;
  } else {
    return redirectRoute;
  }
}

String? unprotectedRouteRedirect(BuildContext context, String? redirect) {
  // Do not run token refresh from public startup routes.
  // On Android first launch, waiting on async auth/network work here can leave
  // GoRouter with no built page (Router -> SizedBox.shrink), which appears as a
  // blank installed app. Public routes must paint immediately; protected routes
  // still validate tokens through protectedRouteRedirect.
  return null;
}
