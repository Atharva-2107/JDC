import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// JDC Typography System
/// Display/Headers: Syne (bold, geometric, automotive feel)
/// Body: DM Sans (clean, highly legible)
abstract class AppTypography {
  // ── Font Families ─────────────────────────────────────────────────────────
  static String get displayFont => 'Syne';
  static TextStyle get _dmSans => GoogleFonts.dmSans();

  // ── Display ───────────────────────────────────────────────────────────────
  static TextStyle displayLarge(Color color) => TextStyle(
        fontFamily: displayFont,
        fontSize: 48,
        fontWeight: FontWeight.w800,
        color: color,
        letterSpacing: -1.5,
        height: 1.1,
      );

  static TextStyle displayMedium(Color color) => TextStyle(
        fontFamily: displayFont,
        fontSize: 36,
        fontWeight: FontWeight.w700,
        color: color,
        letterSpacing: -1.0,
        height: 1.15,
      );

  static TextStyle displaySmall(Color color) => TextStyle(
        fontFamily: displayFont,
        fontSize: 28,
        fontWeight: FontWeight.w700,
        color: color,
        letterSpacing: -0.5,
        height: 1.2,
      );

  // ── Headlines ─────────────────────────────────────────────────────────────
  static TextStyle headlineLarge(Color color) => TextStyle(
        fontFamily: displayFont,
        fontSize: 24,
        fontWeight: FontWeight.w700,
        color: color,
        letterSpacing: -0.3,
        height: 1.25,
      );

  static TextStyle headlineMedium(Color color) => TextStyle(
        fontFamily: displayFont,
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: color,
        letterSpacing: -0.2,
        height: 1.3,
      );

  static TextStyle headlineSmall(Color color) => TextStyle(
        fontFamily: displayFont,
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: color,
        letterSpacing: -0.1,
        height: 1.35,
      );

  // ── Body ─────────────────────────────────────────────────────────────────
  static TextStyle bodyLarge(Color color) => _dmSans.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        color: color,
        height: 1.6,
      );

  static TextStyle bodyMedium(Color color) => _dmSans.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: color,
        height: 1.55,
      );

  static TextStyle bodySmall(Color color) => _dmSans.copyWith(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: color,
        height: 1.5,
      );

  // ── Labels ────────────────────────────────────────────────────────────────
  static TextStyle labelLarge(Color color) => _dmSans.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: color,
        letterSpacing: 0.1,
      );

  static TextStyle labelMedium(Color color) => _dmSans.copyWith(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: color,
        letterSpacing: 0.5,
      );

  static TextStyle labelSmall(Color color) => _dmSans.copyWith(
        fontSize: 10,
        fontWeight: FontWeight.w600,
        color: color,
        letterSpacing: 0.8,
      );

  // ── Special ───────────────────────────────────────────────────────────────
  static TextStyle overline(Color color) => _dmSans.copyWith(
        fontSize: 10,
        fontWeight: FontWeight.w700,
        color: color,
        letterSpacing: 2.0,
      );

  static TextStyle monoSmall(Color color) => GoogleFonts.jetBrainsMono(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: color,
        letterSpacing: 0.5,
      );

  // ── Material Text Theme ───────────────────────────────────────────────────
  static TextTheme buildTextTheme(bool isDark) {
    final primary =
        isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final secondary =
        isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    return TextTheme(
      displayLarge: displayLarge(primary),
      displayMedium: displayMedium(primary),
      displaySmall: displaySmall(primary),
      headlineLarge: headlineLarge(primary),
      headlineMedium: headlineMedium(primary),
      headlineSmall: headlineSmall(primary),
      bodyLarge: bodyLarge(primary),
      bodyMedium: bodyMedium(primary),
      bodySmall: bodySmall(secondary),
      labelLarge: labelLarge(primary),
      labelMedium: labelMedium(secondary),
      labelSmall: labelSmall(secondary),
    );
  }
}