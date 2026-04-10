import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/theme_provider.dart';
import '../../../supabase/supabase_client.dart';
import '../../auth/providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);
    final isDark = themeMode == ThemeMode.dark;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final user = supabase.auth.currentUser;

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),

              Text('Settings',
                  style: TextStyle(
                    fontFamily: 'Syne',
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: textP,
                    letterSpacing: -0.5,
                  )).animate().fadeIn(duration: 400.ms),

              const SizedBox(height: 28),

              // Account section
              _SettingsSection(
                title: 'Account',
                isDark: isDark,
                children: [
                  _SettingsTile(
                    icon: Iconsax.user_octagon,
                    label: user?.email ?? 'Not signed in',
                    subtitle: 'Signed in via Supabase',
                    isDark: isDark,
                    onTap: null,
                  ),
                ],
              ).animate().fadeIn(delay: 100.ms, duration: 400.ms),

              const SizedBox(height: 16),

              // Appearance section
              _SettingsSection(
                title: 'Appearance',
                isDark: isDark,
                children: [
                  _SettingsTile(
                    icon: isDark ? Iconsax.moon : Iconsax.sun_1,
                    label: 'Dark Mode',
                    subtitle: isDark ? 'Currently using dark theme' : 'Currently using light theme',
                    trailing: Switch(
                      value: isDark,
                      onChanged: (_) => ref.read(themeProvider.notifier).toggleTheme(),
                      activeColor: AppColors.primary,
                    ),
                    isDark: isDark,
                    onTap: () => ref.read(themeProvider.notifier).toggleTheme(),
                  ),
                ],
              ).animate().fadeIn(delay: 125.ms, duration: 400.ms),

              const SizedBox(height: 16),

              // Notifications section
              _SettingsSection(
                title: 'Notifications',
                isDark: isDark,
                children: [
                  _SettingsTile(
                    icon: Iconsax.notification,
                    label: 'Push Notifications',
                    subtitle: 'Crash alerts and system notifications',
                    trailing: Switch(
                      value: true,
                      onChanged: (_) {},
                      activeColor: AppColors.primary,
                    ),
                    isDark: isDark,
                    onTap: null,
                  ),
                ],
              ).animate().fadeIn(delay: 150.ms, duration: 400.ms),

              const SizedBox(height: 16),

              // Privacy
              _SettingsSection(
                title: 'Privacy & Safety',
                isDark: isDark,
                children: [
                  _SettingsTile(
                    icon: Iconsax.shield_tick,
                    label: 'Location Sharing',
                    subtitle: 'Shared with emergency contacts during alerts',
                    trailing: Switch(
                      value: true,
                      onChanged: (_) {},
                      activeColor: AppColors.primary,
                    ),
                    isDark: isDark,
                    onTap: null,
                  ),
                  _SettingsTile(
                    icon: Iconsax.document,
                    label: 'Privacy Policy',
                    isDark: isDark,
                    onTap: () {},
                    trailing: Icon(Iconsax.arrow_right_3, size: 16, color: textS),
                  ),
                ],
              ).animate().fadeIn(delay: 200.ms, duration: 400.ms),

              const SizedBox(height: 16),

              // About
              _SettingsSection(
                title: 'About',
                isDark: isDark,
                children: [
                  _SettingsTile(
                    icon: Iconsax.info_circle,
                    label: 'App Version',
                    subtitle: '1.0.0 — JDC',
                    isDark: isDark,
                    onTap: null,
                  ),
                ],
              ).animate().fadeIn(delay: 250.ms, duration: 400.ms),

              const SizedBox(height: 24),

              // Danger zone - Logout
              SizedBox(
                width: double.infinity,
                height: 54,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                        title: Text('Sign Out',
                            style: TextStyle(fontFamily: 'Syne', fontWeight: FontWeight.w700, color: textP)),
                        content: Text('Are you sure you want to sign out?',
                            style: TextStyle(fontFamily: 'Syne', color: textS)),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Cancel', style: TextStyle(fontFamily: 'Syne')),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            child: const Text('Sign Out',
                                style: TextStyle(fontFamily: 'Syne', color: AppColors.primary)),
                          ),
                        ],
                      ),
                    );
                    if (confirmed == true) {
                      await ref.read(authProvider.notifier).signOut();
                    }
                  },
                  icon: const Icon(Iconsax.logout, color: AppColors.primary, size: 18),
                  label: const Text('Sign Out',
                      style: TextStyle(
                          fontFamily: 'Syne',
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.primary, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    minimumSize: Size.zero,
                  ),
                ),
              ).animate().fadeIn(delay: 300.ms, duration: 400.ms),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  final String title;
  final bool isDark;
  final List<Widget> children;

  const _SettingsSection({required this.title, required this.isDark, required this.children});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(title,
              style: TextStyle(
                fontFamily: 'Syne',
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                letterSpacing: 0.8,
              )),
        ),
        Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
          ),
          child: Column(
            children: children.map((c) {
              final idx = children.indexOf(c);
              return Column(
                children: [
                  c,
                  if (idx < children.length - 1)
                    Divider(
                      height: 1,
                      indent: 52,
                      color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    ),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final Widget? trailing;
  final bool isDark;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.label,
    this.subtitle,
    this.trailing,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 20, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(fontFamily: 'Syne', fontSize: 14, fontWeight: FontWeight.w600, color: textP)),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(subtitle!,
                        style: TextStyle(fontFamily: 'Syne', fontSize: 12, color: textS)),
                  ],
                ],
              ),
            ),
            if (trailing != null) trailing!,
          ],
        ),
      ),
    );
  }
}
