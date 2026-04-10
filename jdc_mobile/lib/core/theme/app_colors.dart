import 'package:flutter/material.dart';

/// JDC Design System — Color Palette
/// Concept: High-contrast safety-first UI with a dark carbon base,
/// electric red as the danger/SOS accent, and cool steel for data surfaces.
/// Feels like a professional vehicle dashboard — authoritative, trustworthy.
abstract class AppColors {
  // ── Brand Core ────────────────────────────────────────────────────────────
  static const Color primary = Color(0xFFE8002D);        // Emergency Red
  static const Color primaryDark = Color(0xFFB5001F);    // Deep Red
  static const Color primaryLight = Color(0xFFFF3355);   // Bright Red (light mode)
  static const Color primaryContainer = Color(0xFF3D0010); // Red tint surface

  static const Color accent = Color(0xFF00D4FF);         // Electric Cyan (safe/ok)
  static const Color accentDark = Color(0xFF0099BB);
  static const Color accentContainer = Color(0xFF00192B);

  static const Color warning = Color(0xFFFFB800);        // Amber warning
  static const Color warningContainer = Color(0xFF2B2000);
  static const Color success = Color(0xFF00C853);        // Safe green
  static const Color successContainer = Color(0xFF002211);

  // ── Dark Theme Surfaces ───────────────────────────────────────────────────
  static const Color darkBackground = Color(0xFF0A0A0F);   // Near black
  static const Color darkSurface = Color(0xFF13131A);      // Card surface
  static const Color darkSurface2 = Color(0xFF1C1C27);     // Elevated surface
  static const Color darkSurface3 = Color(0xFF252534);     // Highest elevation
  static const Color darkBorder = Color(0xFF2E2E42);       // Subtle border
  static const Color darkBorderBright = Color(0xFF424260); // Visible border

  // ── Light Theme Surfaces ──────────────────────────────────────────────────
  static const Color lightBackground = Color(0xFFF4F4F8);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurface2 = Color(0xFFF0F0F5);
  static const Color lightSurface3 = Color(0xFFE8E8F0);
  static const Color lightBorder = Color(0xFFE0E0EA);
  static const Color lightBorderBright = Color(0xFFCCCCDC);

  // ── Text ─────────────────────────────────────────────────────────────────
  static const Color darkTextPrimary = Color(0xFFF0F0FF);
  static const Color darkTextSecondary = Color(0xFF9090B0);
  static const Color darkTextTertiary = Color(0xFF5A5A78);
  static const Color darkTextDisabled = Color(0xFF3A3A52);

  static const Color lightTextPrimary = Color(0xFF0D0D1A);
  static const Color lightTextSecondary = Color(0xFF5A5A78);
  static const Color lightTextTertiary = Color(0xFF8A8AA8);
  static const Color lightTextDisabled = Color(0xFFB0B0C8);

  // ── Status Colors ─────────────────────────────────────────────────────────
  static const Color statusOnline = Color(0xFF00C853);
  static const Color statusOffline = Color(0xFF616180);
  static const Color statusAlert = Color(0xFFE8002D);
  static const Color statusClaimed = Color(0xFF00D4FF);
  static const Color statusCancelled = Color(0xFFFFB800);

  // ── Gradients ─────────────────────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFE8002D), Color(0xFF7B0015)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [Color(0xFF00D4FF), Color(0xFF0066CC)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkCardGradient = LinearGradient(
    colors: [Color(0xFF1C1C27), Color(0xFF13131A)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient sosGradient = LinearGradient(
    colors: [Color(0xFFE8002D), Color(0xFFFF6B35)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // ── Transparent variants ──────────────────────────────────────────────────
  static Color primaryWithOpacity(double opacity) =>
      primary.withOpacity(opacity);
  static Color accentWithOpacity(double opacity) =>
      accent.withOpacity(opacity);
}