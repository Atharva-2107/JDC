import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../router/app_router.dart';
import '../../../theme/app_colors.dart';
import '../../../supabase/supabase_client.dart';

// ── Providers ─────────────────────────────────────────────────────────────────
final userProfileProvider = FutureProvider((ref) async {
  final uid = supabase.auth.currentUser?.id;
  if (uid == null) return null;
  return await supabase.from('users').select().eq('id', uid).maybeSingle();
});

final activeDeviceProvider = FutureProvider((ref) async {
  final uid = supabase.auth.currentUser?.id;
  if (uid == null) return null;
  return await supabase
      .from('devices')
      .select()
      .eq('user_id', uid)
      .eq('is_active', true)
      .maybeSingle();
});

final recentIncidentsProvider = FutureProvider((ref) async {
  final uid = supabase.auth.currentUser?.id;
  if (uid == null) return [];
  final res = await supabase
      .from('incidents')
      .select()
      .eq('user_id', uid)
      .order('created_at', ascending: false)
      .limit(5);
  return res as List<dynamic>;
});

// ── Dashboard Screen ──────────────────────────────────────────────────────────
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    final profileAsync = ref.watch(userProfileProvider);
    final deviceAsync = ref.watch(activeDeviceProvider);
    final incidentsAsync = ref.watch(recentIncidentsProvider);

    final user = Supabase.instance.client.auth.currentUser;
    final displayName = profileAsync.value?['full_name'] ??
        user?.userMetadata?['full_name'] ??
        user?.email?.split('@').first ??
        'Driver';

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            ref.invalidate(userProfileProvider);
            ref.invalidate(activeDeviceProvider);
            ref.invalidate(recentIncidentsProvider);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 24),

                // ── Greeting ──────────────────────────────────────────────
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _greeting(),
                          style: TextStyle(
                            fontFamily: 'Syne',
                            fontSize: 14,
                            color: textS,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          displayName.toString().split(' ').first,
                          style: TextStyle(
                            fontFamily: 'Syne',
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            color: textP,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                    GestureDetector(
                      onTap: () => context.go(AppRoutes.profile),
                      child: CircleAvatar(
                        radius: 22,
                        backgroundColor: AppColors.primaryContainer,
                        child: Text(
                          displayName.toString().isNotEmpty
                              ? displayName.toString()[0].toUpperCase()
                              : 'J',
                          style: const TextStyle(
                            fontFamily: 'Syne',
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ),
                  ],
                ).animate().fadeIn(duration: 500.ms),

                const SizedBox(height: 28),

                // ── Device Status Card ────────────────────────────────────
                deviceAsync.when(
                  loading: () => _shimmerCard(isDark),
                  error: (_, __) => const SizedBox(),
                  data: (device) => _DeviceStatusCard(device: device, isDark: isDark),
                ).animate().slideY(begin: 0.08, end: 0, delay: 100.ms, duration: 400.ms).fadeIn(delay: 100.ms),

                const SizedBox(height: 24),

                // ── Quick Actions ─────────────────────────────────────────
                Row(
                  children: [
                    _QuickActionCard(
                      label: 'View Incidents',
                      icon: Iconsax.activity,
                      color: AppColors.accent,
                      onTap: () => context.go(AppRoutes.incidents),
                      isDark: isDark,
                    ),
                    const SizedBox(width: 12),
                    _QuickActionCard(
                      label: 'Nearby Hospitals',
                      icon: Iconsax.hospital,
                      color: AppColors.success,
                      onTap: () => context.go(AppRoutes.hospitals),
                      isDark: isDark,
                    ),
                  ],
                ).animate().slideY(begin: 0.08, end: 0, delay: 200.ms, duration: 400.ms).fadeIn(delay: 200.ms),

                const SizedBox(height: 24),

                // ── Safety Status ────────────────────────────────────────
                _SafetyStatusCard(isDark: isDark)
                    .animate()
                    .slideY(begin: 0.08, end: 0, delay: 280.ms, duration: 400.ms)
                    .fadeIn(delay: 280.ms),

                const SizedBox(height: 24),

                // ── Recent Incidents ──────────────────────────────────────
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Recent Incidents',
                      style: TextStyle(
                        fontFamily: 'Syne',
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: textP,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => context.go(AppRoutes.incidents),
                      child: const Text(
                        'View all',
                        style: TextStyle(
                          fontFamily: 'Syne',
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.accent,
                        ),
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 350.ms, duration: 400.ms),

                const SizedBox(height: 12),

                incidentsAsync.when(
                  loading: () => Column(
                    children: List.generate(2, (_) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _shimmerCard(isDark),
                    )),
                  ),
                  error: (_, __) => const SizedBox(),
                  data: (incidents) => incidents.isEmpty
                      ? _EmptyIncidentsCard(isDark: isDark)
                      : Column(
                          children: incidents
                              .map((i) => _IncidentListItem(
                                    incident: i as Map<String, dynamic>,
                                    isDark: isDark,
                                    onTap: () => context.go('/incidents/${i['id']}'),
                                  ))
                              .toList(),
                        ),
                ).animate().fadeIn(delay: 400.ms, duration: 400.ms),

                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }

  Widget _shimmerCard(bool isDark) => Container(
        height: 80,
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface2 : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(16),
        ),
      );
}

// ── Device Status Card ────────────────────────────────────────────────────────
class _DeviceStatusCard extends StatelessWidget {
  final Map<String, dynamic>? device;
  final bool isDark;
  const _DeviceStatusCard({required this.device, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final isConnected = device != null && (device!['is_active'] as bool? ?? false);
    final plate = device?['vehicle_plate'] as String?;
    final battery = device?['battery_pct'] as int?;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'JDC Device',
                style: TextStyle(
                  fontFamily: 'Syne',
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.white70,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: isConnected ? AppColors.success : Colors.grey,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isConnected ? 'Active' : 'Offline',
                      style: const TextStyle(
                        fontFamily: 'Syne',
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            device != null ? (device!['device_name'] ?? 'JDC Device') : 'No Device Paired',
            style: const TextStyle(
              fontFamily: 'Syne',
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: -0.3,
            ),
          ),
          if (plate != null) ...[
            const SizedBox(height: 4),
            Text(
              plate,
              style: const TextStyle(
                fontFamily: 'Syne',
                fontSize: 13,
                color: Colors.white70,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.5,
              ),
            ),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              Icon(
                battery != null ? _batteryIcon(battery) : Iconsax.bluetooth,
                size: 16,
                color: Colors.white70,
              ),
              const SizedBox(width: 6),
              Text(
                battery != null ? '$battery% battery' : (device == null ? 'Tap here to pair a device' : 'Signal OK'),
                style: const TextStyle(
                  fontFamily: 'Syne',
                  fontSize: 12,
                  color: Colors.white70,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _batteryIcon(int pct) {
    if (pct > 75) return Icons.battery_full;
    if (pct > 50) return Icons.battery_5_bar;
    if (pct > 25) return Icons.battery_3_bar;
    return Icons.battery_1_bar;
  }
}

// ── Quick Action Card ─────────────────────────────────────────────────────────
class _QuickActionCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final bool isDark;

  const _QuickActionCard({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(height: 10),
              Text(
                label,
                style: TextStyle(
                  fontFamily: 'Syne',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Safety Status Card ────────────────────────────────────────────────────────
class _SafetyStatusCard extends StatelessWidget {
  final bool isDark;
  const _SafetyStatusCard({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.successContainer,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Iconsax.shield_tick, color: AppColors.success, size: 22),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'You\'re Protected',
                  style: TextStyle(
                    fontFamily: 'Syne',
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.success,
                  ),
                ),
                SizedBox(height: 3),
                Text(
                  'JDC is monitoring for crash events in real-time.',
                  style: TextStyle(
                    fontFamily: 'Syne',
                    fontSize: 12,
                    color: AppColors.success,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Incident List Item ────────────────────────────────────────────────────────
class _IncidentListItem extends StatelessWidget {
  final Map<String, dynamic> incident;
  final bool isDark;
  final VoidCallback onTap;
  const _IncidentListItem({required this.incident, required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final status = incident['status'] as String? ?? 'alert_sent';
    final createdAt = DateTime.tryParse(incident['created_at'] ?? '')?.toLocal();
    final statusColor = _statusColor(status);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Iconsax.warning_2, color: statusColor, size: 18),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Crash Detected',
                    style: TextStyle(
                      fontFamily: 'Syne',
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    createdAt != null
                        ? _formatDate(createdAt)
                        : 'Unknown time',
                    style: TextStyle(
                      fontFamily: 'Syne',
                      fontSize: 12,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _statusLabel(status),
                style: TextStyle(
                  fontFamily: 'Syne',
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: statusColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'alert_sent': return AppColors.primary;
      case 'cancelled': return AppColors.warning;
      case 'claimed': return AppColors.accent;
      case 'resolved': return AppColors.success;
      default: return AppColors.darkTextSecondary;
    }
  }

  String _statusLabel(String s) {
    switch (s) {
      case 'alert_sent': return 'Alert Sent';
      case 'cancelled': return 'Cancelled';
      case 'claimed': return 'Claimed';
      case 'resolved': return 'Resolved';
      default: return s;
    }
  }

  String _formatDate(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

// ── Empty State ───────────────────────────────────────────────────────────────
class _EmptyIncidentsCard extends StatelessWidget {
  final bool isDark;
  const _EmptyIncidentsCard({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
      ),
      child: Column(
        children: [
          Icon(Iconsax.shield_tick,
              size: 48,
              color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary),
          const SizedBox(height: 12),
          Text(
            'No incidents recorded',
            style: TextStyle(
              fontFamily: 'Syne',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Stay safe. JDC is monitoring in the background.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: 'Syne',
              fontSize: 13,
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
