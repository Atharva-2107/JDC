import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../supabase/supabase_client.dart';

// ── Auth state ────────────────────────────────────────────────────────────────
enum AuthStatus { idle, loading, success, error }

class AuthState {
  final AuthStatus status;
  final String? errorMessage;
  const AuthState({this.status = AuthStatus.idle, this.errorMessage});
  AuthState copyWith({AuthStatus? status, String? errorMessage}) =>
      AuthState(status: status ?? this.status, errorMessage: errorMessage);
}

// ── Auth notifier ─────────────────────────────────────────────────────────────
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState());

  final _googleSignIn = GoogleSignIn();

  // ── Email + Password sign up ─────────────────────────────────────────────
  Future<bool> signUpWithEmail({
    required String email,
    required String password,
    required String fullName,
  }) async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final response = await supabase.auth.signUp(
        email: email,
        password: password,
        data: {'full_name': fullName},
      );
      if (response.user != null) {
        // Create profile row
        await supabase.from(SupabaseTables.users).upsert({
          'id': response.user!.id,
          'full_name': fullName,
        });
        state = state.copyWith(status: AuthStatus.success);
        return true;
      }
      state = state.copyWith(
          status: AuthStatus.error, errorMessage: 'Signup failed');
      return false;
    } on AuthException catch (e) {
      state = state.copyWith(
          status: AuthStatus.error, errorMessage: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(
          status: AuthStatus.error, errorMessage: 'An error occurred');
      return false;
    }
  }

  // ── Email + Password login ───────────────────────────────────────────────
  Future<bool> signInWithEmail({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      await supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );
      state = state.copyWith(status: AuthStatus.success);
      return true;
    } on AuthException catch (e) {
      state = state.copyWith(
          status: AuthStatus.error, errorMessage: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(
          status: AuthStatus.error, errorMessage: 'An error occurred');
      return false;
    }
  }

  // ── Google Sign-In ────────────────────────────────────────────────────────
  Future<bool> signInWithGoogle() async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        state = state.copyWith(status: AuthStatus.idle);
        return false;
      }
      final googleAuth = await googleUser.authentication;
      final accessToken = googleAuth.accessToken;
      final idToken = googleAuth.idToken;

      if (accessToken == null || idToken == null) {
        state = state.copyWith(
            status: AuthStatus.error, errorMessage: 'Google auth failed');
        return false;
      }

      final response = await supabase.auth.signInWithIdToken(
        provider: OAuthProvider.google,
        idToken: idToken,
        accessToken: accessToken,
      );

      if (response.user != null) {
        // Upsert profile (in case first-time Google login)
        await supabase.from(SupabaseTables.users).upsert({
          'id': response.user!.id,
          'full_name': response.user!.userMetadata?['full_name'] ??
              googleUser.displayName,
        }, onConflict: 'id');
        state = state.copyWith(status: AuthStatus.success);
        return true;
      }
      state = state.copyWith(
          status: AuthStatus.error, errorMessage: 'Login failed');
      return false;
    } catch (e) {
      state = state.copyWith(
          status: AuthStatus.error, errorMessage: 'Google sign-in failed');
      return false;
    }
  }

  // ── Phone OTP — send ─────────────────────────────────────────────────────
  Future<bool> sendOtp(String phone) async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      await supabase.auth.signInWithOtp(phone: phone);
      state = state.copyWith(status: AuthStatus.success);
      return true;
    } on AuthException catch (e) {
      state = state.copyWith(
          status: AuthStatus.error, errorMessage: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(
          status: AuthStatus.error, errorMessage: 'Failed to send OTP');
      return false;
    }
  }

  // ── Phone OTP — verify ────────────────────────────────────────────────────
  Future<bool> verifyOtp({required String phone, required String token}) async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final response = await supabase.auth.verifyOTP(
        phone: phone,
        token: token,
        type: OtpType.sms,
      );
      if (response.user != null) {
        await supabase.from(SupabaseTables.users).upsert(
          {'id': response.user!.id},
          onConflict: 'id',
        );
        state = state.copyWith(status: AuthStatus.success);
        return true;
      }
      state = state.copyWith(
          status: AuthStatus.error, errorMessage: 'Invalid OTP');
      return false;
    } on AuthException catch (e) {
      state = state.copyWith(
          status: AuthStatus.error, errorMessage: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(
          status: AuthStatus.error, errorMessage: 'Verification failed');
      return false;
    }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  Future<void> signOut() async {
    await _googleSignIn.signOut();
    await supabase.auth.signOut();
    state = const AuthState();
  }

  void clearError() => state = state.copyWith(status: AuthStatus.idle);
}

final authProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());

final currentUserProvider = Provider((ref) => supabase.auth.currentUser);
