import 'dart:io';
import 'dart:typed_data';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import '../supabase/supabase_client.dart';

/// Background message handler — must be top-level function
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await NotificationService.instance._showCrashAlert(message);
}

class NotificationService {
  NotificationService._();
  static final instance = NotificationService._();

  final _fcm = FirebaseMessaging.instance;
  final _localNotifications = FlutterLocalNotificationsPlugin();

  // Full-screen crash alert channel (high importance, wakes screen)
  static const _crashChannel = AndroidNotificationChannel(
    'jdc_crash_alert',
    'JDC Crash Alert',
    description: 'Full-screen crash detection alerts',
    importance: Importance.max,
    playSound: true,
    enableVibration: true,
    enableLights: true,
    ledColor: Color(0xFFE8002D),
    showBadge: true,
  );

  // General info channel (incident updates, device status)
  static const _infoChannel = AndroidNotificationChannel(
    'jdc_info',
    'JDC Notifications',
    description: 'General JDC app notifications',
    importance: Importance.high,
    playSound: true,
    enableVibration: true,
  );

  GlobalKey<NavigatorState>? navigatorKey;

  Future<void> init({GlobalKey<NavigatorState>? navKey}) async {
    navigatorKey = navKey;

    // Request permission
    await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      criticalAlert: true, // iOS only — wakes even in DND
    );

    // Create Android channels
    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.createNotificationChannel(_crashChannel);
    await androidPlugin?.createNotificationChannel(_infoChannel);

    // Init local notifications
    await _localNotifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(
          requestAlertPermission: true,
          requestBadgePermission: true,
          requestSoundPermission: true,
          requestCriticalPermission: true,
        ),
      ),
      onDidReceiveNotificationResponse: _onNotificationTapped,
      onDidReceiveBackgroundNotificationResponse: _onBackgroundNotificationTapped,
    );

    // Handle FCM messages
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    FirebaseMessaging.onMessage.listen(_onForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_onMessageOpenedApp);

    // Check if app was opened from a notification
    final initial = await _fcm.getInitialMessage();
    if (initial != null) _navigateFromMessage(initial);

    // Save FCM token to Supabase
    await _saveToken();
    _fcm.onTokenRefresh.listen(_updateToken);
  }

  // ── Token Management ────────────────────────────────────────────────────
  Future<void> _saveToken() async {
    final token = await _fcm.getToken();
    if (token == null) return;
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;

    await supabase.from(SupabaseTables.fcmTokens).upsert({
      'user_id': userId,
      'token': token,
      'platform': Platform.isAndroid ? 'android' : 'ios',
      'updated_at': DateTime.now().toIso8601String(),
    }, onConflict: 'user_id, token');
  }

  /// Call this after pairing a device to ensure the FCM token is freshly registered.
  Future<void> refreshToken() => _saveToken();

  Future<void> _updateToken(String token) async {
    await _saveToken();
  }

  // ── Message Handlers ────────────────────────────────────────────────────
  Future<void> _onForegroundMessage(RemoteMessage message) async {
    final type = message.data['type'];
    if (type == 'crash_alert') {
      await _showCrashAlert(message);
      _navigateFromMessage(message); // Auto-navigate directly to the screen
    } else {
      await _showInfoNotification(message);
    }
  }

  void _onMessageOpenedApp(RemoteMessage message) {
    _navigateFromMessage(message);
  }

  // ── Show full-screen crash alert (wakes screen) ─────────────────────────
  Future<void> _showCrashAlert(RemoteMessage message) async {
    final incidentId = message.data['incident_id'] ?? '';
    final lat = message.data['lat'] ?? '0';
    final lng = message.data['lng'] ?? '0';

    await _localNotifications.show(
      999, // fixed ID so duplicate crashes update the same notification
      '🚨 CRASH DETECTED',
      'Your JDC device detected a crash. Tap to respond.',
      NotificationDetails(
        android: AndroidNotificationDetails(
          _crashChannel.id,
          _crashChannel.name,
          channelDescription: _crashChannel.description,
          importance: Importance.max,
          priority: Priority.max,
          category: AndroidNotificationCategory.call, // wakes screen like a call
          fullScreenIntent: true,          // ← THIS wakes the screen
          ongoing: false,
          autoCancel: true,
          color: const Color(0xFFE8002D),
          ledColor: const Color(0xFFE8002D),
          ledOnMs: 500,
          ledOffMs: 500,
          enableVibration: true,
          vibrationPattern: Int64List.fromList([0, 500, 200, 500, 200, 500]),
          playSound: true,
          actions: [
            const AndroidNotificationAction(
              'cancel_action',
              '✓ I\'m OK — Cancel',
              cancelNotification: true,
            ),
            const AndroidNotificationAction(
              'call_action',
              '📞 Call Emergency',
              cancelNotification: true,
            ),
          ],
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
          interruptionLevel: InterruptionLevel.critical,
        ),
      ),
      payload: 'crash:$incidentId:$lat:$lng',
    );
  }

  Future<void> _showInfoNotification(RemoteMessage message) async {
    final title = message.notification?.title ?? 'JDC Update';
    final body = message.notification?.body ?? '';
    final type = message.data['type'] ?? '';

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _infoChannel.id,
          _infoChannel.name,
          importance: Importance.high,
          priority: Priority.high,
          color: type == 'claimed'
              ? const Color(0xFF00D4FF)
              : const Color(0xFFFFB800),
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: 'info:${message.data['incident_id'] ?? ''}',
    );
  }

  // ── Navigation from notification ─────────────────────────────────────────
  void _navigateFromMessage(RemoteMessage message) {
    final type = message.data['type'];
    if (type == 'crash_alert') {
      final id = message.data['incident_id'] ?? '';
      final lat = message.data['lat'] ?? '0';
      final lng = message.data['lng'] ?? '0';
      navigatorKey?.currentContext?.go(
        '/crash-alert?incidentId=$id&lat=$lat&lng=$lng',
      );
    } else if (type == 'claimed') {
      final id = message.data['incident_id'] ?? '';
      navigatorKey?.currentContext?.go('/incidents/$id');
    }
  }

  @pragma('vm:entry-point')
  static void _onNotificationTapped(NotificationResponse response) {
    _handlePayload(response.payload, response.actionId);
  }

  @pragma('vm:entry-point')
  static void _onBackgroundNotificationTapped(NotificationResponse response) {
    _handlePayload(response.payload, response.actionId);
  }

  static void _handlePayload(String? payload, String? actionId) {
    if (payload == null) return;
    // Payload handled by _navigateFromMessage on next launch if background
    // For foreground, router handles it
  }
}