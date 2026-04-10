import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../router/app_router.dart';
import '../../../theme/app_colors.dart';
import '../../../supabase/supabase_client.dart';
import '../../dashboard/screens/dashboard_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final surface = isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    final profileAsync = ref.watch(userProfileProvider);
    final deviceAsync = ref.watch(activeDeviceProvider);

    final user = Supabase.instance.client.auth.currentUser;

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            ref.invalidate(userProfileProvider);
            ref.invalidate(activeDeviceProvider);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: profileAsync.when(
              loading: () => const Center(
                  child: Padding(
                padding: EdgeInsets.only(top: 80),
                child: CircularProgressIndicator(color: AppColors.primary),
              )),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (profile) {
                final fullName = profile?['full_name'] ??
                    user?.userMetadata?['full_name'] ??
                    'User';
                final email = user?.email ?? '';
                final bloodGroup = profile?['blood_group'] as String?;
                final gender = profile?['gender'] as String?;
                final initial = fullName.toString().isNotEmpty
                    ? fullName.toString()[0].toUpperCase()
                    : 'U';

                return Column(
                  children: [
                    const SizedBox(height: 24),

                    // ── Header ──────────────────────────────────────────────
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Profile',
                            style: TextStyle(
                              fontFamily: 'Syne',
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              color: textP,
                              letterSpacing: -0.5,
                            )),
                        IconButton(
                          onPressed: () => context.go(AppRoutes.editProfile),
                          icon: const Icon(Iconsax.edit_2, size: 20),
                          color: AppColors.primary,
                          style: IconButton.styleFrom(
                            backgroundColor: AppColors.primaryContainer,
                          ),
                        ),
                      ],
                    ).animate().fadeIn(duration: 400.ms),

                    const SizedBox(height: 24),

                    // ── Avatar & Name ────────────────────────────────────────
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.25),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          CircleAvatar(
                            radius: 40,
                            backgroundColor: Colors.white.withValues(alpha: 0.15),
                            child: Text(
                              initial,
                              style: const TextStyle(
                                fontFamily: 'Syne',
                                fontSize: 32,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Text(
                            fullName.toString(),
                            style: const TextStyle(
                              fontFamily: 'Syne',
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            email,
                            style: const TextStyle(
                              fontFamily: 'Syne',
                              fontSize: 13,
                              color: Colors.white70,
                            ),
                          ),
                          if (bloodGroup != null || gender != null) ...[
                            const SizedBox(height: 14),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                if (bloodGroup != null)
                                  _InfoBadge(label: bloodGroup, icon: Iconsax.drop),
                                if (bloodGroup != null && gender != null)
                                  const SizedBox(width: 10),
                                if (gender != null)
                                  _InfoBadge(label: gender, icon: Iconsax.user),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ).animate().slideY(begin: 0.08, end: 0, delay: 100.ms, duration: 400.ms).fadeIn(delay: 100.ms),

                    const SizedBox(height: 20),

                    // ── Emergency Contacts ───────────────────────────────────
                    _SectionCard(
                      title: 'Emergency Contacts',
                      icon: Iconsax.call,
                      iconColor: AppColors.primary,
                      isDark: isDark,
                      onTap: () => context.go(AppRoutes.contacts),
                      child: _ContactsPreview(isDark: isDark),
                    ).animate().slideY(begin: 0.08, end: 0, delay: 200.ms, duration: 400.ms).fadeIn(delay: 200.ms),

                    const SizedBox(height: 12),

                    // ── Device ────────────────────────────────────────────────
                    deviceAsync.when(
                      loading: () => _SectionCard(
                        title: 'My Vehicle',
                        icon: Iconsax.car,
                        iconColor: AppColors.accent,
                        isDark: isDark,
                        onTap: () => context.go(AppRoutes.device),
                        child: Text('Loading...',
                            style: TextStyle(
                                fontFamily: 'Syne',
                                color: textS,
                                fontSize: 13)),
                      ),
                      error: (_, __) => const SizedBox(),
                      data: (device) => _SectionCard(
                        title: 'My Vehicle',
                        icon: Iconsax.car,
                        iconColor: AppColors.accent,
                        isDark: isDark,
                        onTap: () => context.go(AppRoutes.device),
                        child: device == null
                            ? Text('No device paired. Tap to pair.',
                                style: TextStyle(
                                    fontFamily: 'Syne',
                                    color: textS,
                                    fontSize: 13))
                            : Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          device['device_name'] ?? 'JDC Device',
                                          style: TextStyle(
                                            fontFamily: 'Syne',
                                            fontSize: 15,
                                            fontWeight: FontWeight.w700,
                                            color: isDark
                                                ? AppColors.darkTextPrimary
                                                : AppColors.lightTextPrimary,
                                          ),
                                        ),
                                        if (device['vehicle_plate'] != null) ...[
                                          const SizedBox(height: 2),
                                          Text(
                                            device['vehicle_plate'],
                                            style: const TextStyle(
                                              fontFamily: 'Syne',
                                              fontSize: 13,
                                              fontWeight: FontWeight.w600,
                                              letterSpacing: 1.5,
                                              color: AppColors.accent,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      color: (device['is_active'] as bool? ?? false)
                                          ? AppColors.success
                                          : AppColors.darkTextTertiary,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ).animate().slideY(begin: 0.08, end: 0, delay: 280.ms, duration: 400.ms).fadeIn(delay: 280.ms),

                    const SizedBox(height: 12),

                    // ── Settings ──────────────────────────────────────────────
                    _SectionCard(
                      title: 'Settings',
                      icon: Iconsax.setting_2,
                      iconColor: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      isDark: isDark,
                      onTap: () => context.go(AppRoutes.settings),
                      child: Text(
                        'Theme, notifications, account management',
                        style: TextStyle(
                          fontFamily: 'Syne',
                          fontSize: 13,
                          color: textS,
                        ),
                      ),
                    ).animate().slideY(begin: 0.08, end: 0, delay: 350.ms, duration: 400.ms).fadeIn(delay: 350.ms),

                    const SizedBox(height: 32),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoBadge extends StatelessWidget {
  final String label;
  final IconData icon;
  const _InfoBadge({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: Colors.white),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                fontFamily: 'Syne',
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ],
        ),
      );
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color iconColor;
  final bool isDark;
  final VoidCallback onTap;
  final Widget child;

  const _SectionCard({
    required this.title,
    required this.icon,
    required this.iconColor,
    required this.isDark,
    required this.onTap,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: iconColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: iconColor, size: 18),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: TextStyle(
                    fontFamily: 'Syne',
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: textP,
                  ),
                ),
                const Spacer(),
                Icon(
                  Iconsax.arrow_right_3,
                  size: 16,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ],
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _ContactsPreview extends ConsumerWidget {
  final bool isDark;
  const _ContactsPreview({required this.isDark});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uid = supabase.auth.currentUser?.id;
    if (uid == null) return const SizedBox();

    return FutureBuilder(
      future: supabase.from('emergency_contacts').select().eq('user_id', uid).order('priority').limit(2),
      builder: (context, snap) {
        if (!snap.hasData) {
          return Text('Loading contacts...',
              style: TextStyle(
                  fontFamily: 'Syne',
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  fontSize: 13));
        }
        final contacts = snap.data as List;
        if (contacts.isEmpty) {
          return Text('No emergency contacts added.',
              style: TextStyle(
                  fontFamily: 'Syne',
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  fontSize: 13));
        }
        return Column(
          children: contacts
              .map((c) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        Container(
                          width: 30,
                          height: 30,
                          decoration: const BoxDecoration(
                            color: AppColors.primaryContainer,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              (c['full_name'] as String)[0].toUpperCase(),
                              style: const TextStyle(
                                fontFamily: 'Syne',
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(c['full_name'],
                                  style: TextStyle(
                                    fontFamily: 'Syne',
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                                  )),
                              Text(c['phone'],
                                  style: TextStyle(
                                    fontFamily: 'Syne',
                                    fontSize: 11,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                  )),
                            ],
                          ),
                        ),
                        Text(c['relation'] ?? '',
                            style: TextStyle(
                              fontFamily: 'Syne',
                              fontSize: 11,
                              color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                            )),
                      ],
                    ),
                  ))
              .toList(),
        );
      },
    );
  }
}
