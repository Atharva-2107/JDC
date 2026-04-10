import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/signup_screen.dart';
import '../features/auth/screens/otp_screen.dart';
import '../features/auth/screens/onboarding_screen.dart';
import '../features/setup/setup_wizard_screen.dart';
import '../features/dashboard/screens/dashboard_screen.dart';
import '../features/profile/screens/profile_screen.dart';
import '../features/profile/screens/edit_profile_screen.dart';
import '../features/contacts/screens/contacts_screen.dart';
import '../features/contacts/screens/add_contact_screen.dart';
import '../features/device/screens/device_screen.dart';
import '../features/device/screens/pair_device_screen.dart';
import '../features/incidents/screens/incidents_screen.dart';
import '../features/incidents/screens/incident_detail_screen.dart';
import '../features/hospitals/screens/hospitals_screen.dart';
import '../features/sos/screens/crash_alert_screen.dart';
import '../features/settings/screens/settings_screen.dart';
import 'main_shell.dart';

import 'package:shared_preferences/shared_preferences.dart';

// ── Route names ──────────────────────────────────────────────────────────────
abstract class AppRoutes {
  static const String onboarding = '/onboarding';
  static const String setup = '/setup';
  static const String login = '/login';
  static const String signup = '/signup';
  static const String otp = '/otp';
  static const String home = '/';
  static const String profile = '/profile';
  static const String editProfile = '/profile/edit';
  static const String contacts = '/contacts';
  static const String addContact = '/contacts/add';
  static const String device = '/device';
  static const String pairDevice = '/device/pair';
  static const String incidents = '/incidents';
  static const String incidentDetail = '/incidents/:id';
  static const String hospitals = '/hospitals';
  static const String crashAlert = '/crash-alert';
  static const String settings = '/settings';
}

final rootNavigatorKey = GlobalKey<NavigatorState>();

class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((dynamic _) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

// ── Router provider ──────────────────────────────────────────────────────────
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: AppRoutes.home,
    debugLogDiagnostics: true,
    refreshListenable: GoRouterRefreshStream(Supabase.instance.client.auth.onAuthStateChange),
    redirect: (context, state) async {
      final session = Supabase.instance.client.auth.currentSession;
      final isLoggedIn = session != null;
      final loc = state.matchedLocation;
      final isAuthRoute = loc == AppRoutes.login ||
          loc == AppRoutes.signup ||
          loc == AppRoutes.onboarding ||
          loc == AppRoutes.otp;

      final prefs = await SharedPreferences.getInstance();
      final hasSeenOnboarding = prefs.getBool('hasSeenOnboarding') ?? false;
      final hasCompletedSetup = prefs.getBool('hasCompletedSetup') ?? false;

      // 1. Show onboarding to brand-new installs
      if (!hasSeenOnboarding && loc != AppRoutes.onboarding) {
        return AppRoutes.onboarding;
      }

      // 2. Not logged in → go to login
      if (!isLoggedIn && !isAuthRoute) return AppRoutes.login;

      // 3. Logged in but never done setup → go to setup wizard
      if (isLoggedIn && !hasCompletedSetup && loc != AppRoutes.setup) {
        return AppRoutes.setup;
      }

      // 4. Logged in and done setup, but stuck on auth route → go home
      if (isLoggedIn && isAuthRoute) return AppRoutes.home;

      return null;
    },
    routes: [
      // ── Auth ──────────────────────────────────────────────────────────────
      GoRoute(
        path: AppRoutes.onboarding,
        name: 'onboarding',
        builder: (_, __) => const OnboardingScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.signup,
        name: 'signup',
        builder: (_, __) => const SignupScreen(),
      ),
      GoRoute(
        path: AppRoutes.otp,
        name: 'otp',
        builder: (_, state) {
          final phone = state.uri.queryParameters['phone'] ?? '';
          return OtpScreen(phone: phone);
        },
      ),
      GoRoute(
        path: AppRoutes.setup,
        name: 'setup',
        builder: (_, __) => const SetupWizardScreen(),
      ),

      // ── Main shell with bottom nav ─────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.home,
            name: 'home',
            builder: (_, __) => const DashboardScreen(),
          ),
          GoRoute(
            path: AppRoutes.incidents,
            name: 'incidents',
            builder: (_, __) => const IncidentsScreen(),
            routes: [
              GoRoute(
                path: ':id',
                name: 'incidentDetail',
                builder: (_, state) {
                  final id = state.pathParameters['id']!;
                  return IncidentDetailScreen(incidentId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: AppRoutes.hospitals,
            name: 'hospitals',
            builder: (_, __) => const HospitalsScreen(),
          ),
          GoRoute(
            path: AppRoutes.profile,
            name: 'profile',
            builder: (_, __) => const ProfileScreen(),
          ),
          GoRoute(
            path: AppRoutes.settings,
            name: 'settings',
            builder: (_, __) => const SettingsScreen(),
          ),
        ],
      ),

      // ── Full-screen routes (no shell) ─────────────────────────────────────
      GoRoute(
        path: AppRoutes.editProfile,
        name: 'editProfile',
        builder: (_, __) => const EditProfileScreen(),
      ),
      GoRoute(
        path: AppRoutes.contacts,
        name: 'contacts',
        builder: (_, __) => const ContactsScreen(),
        routes: [
          GoRoute(
            path: 'add',
            name: 'addContact',
            builder: (_, __) => const AddContactScreen(),
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.device,
        name: 'device',
        builder: (_, __) => const DeviceScreen(),
        routes: [
          GoRoute(
            path: 'pair',
            name: 'pairDevice',
            builder: (_, __) => const PairDeviceScreen(),
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.crashAlert,
        name: 'crashAlert',
        builder: (_, state) {
          final incidentId = state.uri.queryParameters['incidentId'] ?? '';
          final lat =
              double.tryParse(state.uri.queryParameters['lat'] ?? '') ?? 0.0;
          final lng =
              double.tryParse(state.uri.queryParameters['lng'] ?? '') ?? 0.0;
          return CrashAlertScreen(
            incidentId: incidentId,
            latitude: lat,
            longitude: lng,
          );
        },
      ),
    ],
  );
});