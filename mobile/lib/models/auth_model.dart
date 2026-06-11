import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:openapi/openapi.dart' as api;
import 'package:receipt_wrangler_mobile/interceptors/auth_interceptor.dart';
import 'package:receipt_wrangler_mobile/persistence/global_shared_preferences.dart';

import '../client/client.dart';

class AuthModel extends ChangeNotifier {
  api.Claims? _claims;

  api.Claims? get claims => _claims;

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
      aOptions: AndroidOptions(
        encryptedSharedPreferences: true,
      ),
      iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock));

  final String _refreshTokenKey = "refreshToken";

  final String _jwtKey = "jwt";

  final _basePathKey = "basePath";
  static const String defaultPublicBasePath =
      "https://methodology-discs-lenders-charleston.trycloudflare.com";

  String get basePath {
    final savedBasePath =
        GlobalSharedPreferences.instance.getString(_basePathKey);
    if (savedBasePath == null || _isStaleLocalBasePath(savedBasePath)) {
      return defaultPublicBasePath;
    }
    return savedBasePath;
  }

  bool _isStaleLocalBasePath(String value) {
    final uri = Uri.tryParse(value);
    final host = uri?.host.toLowerCase();
    return host == null ||
        host == "127.0.0.1" ||
        host == "localhost" ||
        host.startsWith("192.168.") ||
        host.startsWith("10.") ||
        host.startsWith("172.16.") ||
        host.startsWith("172.17.") ||
        host.startsWith("172.18.") ||
        host.startsWith("172.19.") ||
        host.startsWith("172.2") ||
        host.startsWith("172.30.") ||
        host.startsWith("172.31.");
  }

  api.FeatureConfig _featureConfig = (api.FeatureConfigBuilder()
        ..aiPoweredReceipts = false
        ..enableLocalSignUp = false)
      .build();

  api.FeatureConfig get featureConfig => _featureConfig;

  void initializeAuth() {
    _updateDefaultApiClient();
  }

  void setClaims(api.Claims claims) {
    _claims = claims;

    notifyListeners();
  }

  Future<void> setJwt(String? jwt) async {
    await _storage.write(key: _jwtKey, value: jwt ?? null);
    await _updateDefaultApiClient();

    notifyListeners();
  }

  Future<void> setRefreshToken(String? refreshToken) async {
    await _storage.write(key: _refreshTokenKey, value: refreshToken ?? null);

    await _updateDefaultApiClient();

    notifyListeners();
  }

  /// Writes both tokens and rebuilds the API client once, avoiding the
  /// double client rebuild that occurs when calling setJwt + setRefreshToken
  /// individually.
  Future<void> setTokens(String? jwt, String? refreshToken) async {
    await _storage.write(key: _jwtKey, value: jwt);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
    await _updateDefaultApiClient();

    notifyListeners();
  }

  Future<void> purgeTokens() async {
    await _storage.delete(key: _jwtKey);
    await _storage.delete(key: _refreshTokenKey);

    await _updateDefaultApiClient();

    notifyListeners();
  }

  Future<String?> getJwt() async {
    return await _storage.read(key: _jwtKey);
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _refreshTokenKey);
  }

  Future<void> setBasePath(String basePath) async {
    GlobalSharedPreferences.instance.setString(_basePathKey, basePath);

    await _updateDefaultApiClient();

    notifyListeners();
  }

  void setFeatureConfig(api.FeatureConfig? featureConfig) {
    if (featureConfig == null) {
      return;
    } else {
      _featureConfig = featureConfig;
      notifyListeners();
    }
  }

  Future<void> _updateDefaultApiClient() async {
    var jwt = await getJwt();
    var newClient = api.Openapi(basePathOverride: basePath);
    if (jwt != null) {
      newClient.setBearerAuth("bearerAuth", jwt);
    }

    newClient.dio.options.receiveTimeout = Duration(minutes: 5);
    newClient.dio.interceptors.add(AuthInterceptor());
    OpenApiClient.client = newClient;
    return;
  }
}
