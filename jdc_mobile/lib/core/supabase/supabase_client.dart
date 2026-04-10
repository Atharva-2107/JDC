import 'package:supabase_flutter/supabase_flutter.dart';

/// Supabase client singleton — use [supabase] anywhere in the app
SupabaseClient get supabase => Supabase.instance.client;

/// Call once in main() before runApp
Future<void> initSupabase() async {
  await Supabase.initialize(
    url: const String.fromEnvironment(
      'SUPABASE_URL',
      defaultValue: 'https://qrqnrsiwwftqbhauuwbs.supabase.co', 
    ),
    anonKey: const String.fromEnvironment(
      'SUPABASE_ANON_KEY',
      defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFycW5yc2l3d2Z0cWJoYXV1d2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDg0NzQsImV4cCI6MjA4ODIyNDQ3NH0.Y_8-zaVVmsX3coj2XUNTHuKPwvUE80m3z2Qnt7l1rYI', 
    ),
    realtimeClientOptions: const RealtimeClientOptions(
      eventsPerSecond: 2,
    ),
  );
}

/// Table names — single source of truth
abstract class SupabaseTables {
  static const String users = 'users';
  static const String emergencyContacts = 'emergency_contacts';
  static const String incidents = 'incidents';
  static const String devices = 'devices';
  static const String fcmTokens = 'fcm_tokens';
}

/// Realtime channel names
abstract class SupabaseChannels {
  static const String incidents = 'incidents-channel';
  static const String deviceStatus = 'device-status-channel';
}