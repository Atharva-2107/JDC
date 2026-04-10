import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import '../../../router/app_router.dart';
import '../../../theme/app_colors.dart';
import '../../../supabase/supabase_client.dart';
import '../../auth/widgets/auth_field.dart';

// ── Device provider ───────────────────────────────────────────────────────────
final deviceListProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final uid = supabase.auth.currentUser?.id;
  if (uid == null) return [];
  final res = await supabase
      .from('devices')
      .select()
      .eq('user_id', uid)
      .order('created_at', ascending: false);
  return (res as List).cast<Map<String, dynamic>>();
});

// ── Device Screen ─────────────────────────────────────────────────────────────
class DeviceScreen extends ConsumerWidget {
  const DeviceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final devicesAsync = ref.watch(deviceListProvider);

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async => ref.invalidate(deviceListProvider),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('My Devices',
                              style: TextStyle(
                                fontFamily: 'Syne',
                                fontSize: 26,
                                fontWeight: FontWeight.w800,
                                color: textP,
                                letterSpacing: -0.5,
                              )).animate().fadeIn(duration: 400.ms),
                          const SizedBox(height: 4),
                          Text('JDC hardware paired to your account',
                              style: TextStyle(
                                fontFamily: 'Syne', fontSize: 13, color: textS,
                              )).animate().fadeIn(delay: 100.ms),
                        ],
                      ),
                      FloatingActionButton.small(
                        onPressed: () async {
                          await context.push(AppRoutes.pairDevice);
                          ref.invalidate(deviceListProvider);
                        },
                        backgroundColor: AppColors.primary,
                        child: const Icon(Iconsax.add, color: Colors.white),
                      ).animate().scale(delay: 200.ms, duration: 300.ms),
                    ],
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 24)),

              devicesAsync.when(
                loading: () => const SliverToBoxAdapter(
                  child: Center(child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 60),
                    child: CircularProgressIndicator(color: AppColors.primary),
                  )),
                ),
                error: (e, _) => SliverToBoxAdapter(child: Center(child: Text('Error: $e'))),
                data: (devices) {
                  if (devices.isEmpty) {
                    return SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(40),
                        child: Column(
                          children: [
                            Container(
                              width: 100, height: 100,
                              decoration: BoxDecoration(
                                gradient: AppColors.primaryGradient,
                                shape: BoxShape.circle,
                                boxShadow: [BoxShadow(
                                  color: AppColors.primary.withValues(alpha: 0.25),
                                  blurRadius: 25, offset: const Offset(0, 10),
                                )],
                              ),
                              child: const Icon(Iconsax.bluetooth, size: 44, color: Colors.white),
                            ).animate().scale(delay: 100.ms, curve: Curves.easeOutBack),
                            const SizedBox(height: 20),
                            Text('No device paired',
                                style: TextStyle(fontFamily: 'Syne', fontSize: 18, fontWeight: FontWeight.w700, color: textP)),
                            const SizedBox(height: 8),
                            Text('Pair your JDC hardware to enable\ncrash detection features.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontFamily: 'Syne', fontSize: 13, color: textS)),
                            const SizedBox(height: 24),
                            SizedBox(
                              width: 180,
                              child: JdcPrimaryButton(
                                label: 'Pair a Device',
                                icon: Iconsax.bluetooth,
                                onPressed: () async {
                                  await context.push(AppRoutes.pairDevice);
                                  ref.invalidate(deviceListProvider);
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) {
                        final device = devices[i];
                        return Padding(
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                          child: _DeviceCard(
                            device: device,
                            isDark: isDark,
                            onToggleActive: () async {
                              final isActive = device['is_active'] as bool? ?? false;
                              await supabase
                                  .from('devices')
                                  .update({'is_active': !isActive})
                                  .eq('id', device['id']);
                              ref.invalidate(deviceListProvider);
                            },
                            onUnpair: () async {
                              final confirmed = await showDialog<bool>(
                                context: context,
                                builder: (d) => AlertDialog(
                                  backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                                  title: Text('Unpair Device',
                                      style: TextStyle(fontFamily: 'Syne', fontWeight: FontWeight.w700, color: textP)),
                                  content: Text('Are you sure you want to unpair ${device['device_name']}? This cannot be undone.',
                                      style: TextStyle(fontFamily: 'Syne', color: textS)),
                                  actions: [
                                    TextButton(onPressed: () => Navigator.pop(d, false),
                                        child: const Text('Cancel', style: TextStyle(fontFamily: 'Syne'))),
                                    TextButton(onPressed: () => Navigator.pop(d, true),
                                        child: const Text('Unpair',
                                            style: TextStyle(fontFamily: 'Syne', color: AppColors.primary))),
                                  ],
                                ),
                              );
                              if (confirmed == true) {
                                await supabase.from('devices').delete().eq('id', device['id']);
                                ref.invalidate(deviceListProvider);
                              }
                            },
                          ),
                        ).animate().fadeIn(delay: Duration(milliseconds: 150 + i * 60), duration: 300.ms);
                      },
                      childCount: devices.length,
                    ),
                  );
                },
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Device Card ───────────────────────────────────────────────────────────────
class _DeviceCard extends StatelessWidget {
  final Map<String, dynamic> device;
  final bool isDark;
  final VoidCallback onToggleActive;
  final VoidCallback onUnpair;

  const _DeviceCard({
    required this.device,
    required this.isDark,
    required this.onToggleActive,
    required this.onUnpair,
  });

  @override
  Widget build(BuildContext context) {
    final isActive = device['is_active'] as bool? ?? false;
    final plate = device['vehicle_plate'] as String?;
    final battery = device['battery_pct'] as int?;
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isActive
              ? AppColors.success.withValues(alpha: 0.3)
              : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
          width: isActive ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isActive
                      ? AppColors.success.withValues(alpha: 0.1)
                      : (isDark ? AppColors.darkSurface3 : AppColors.lightSurface3),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Iconsax.bluetooth,
                    size: 22,
                    color: isActive ? AppColors.success : textS),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(device['device_name'] ?? 'JDC Device',
                        style: TextStyle(fontFamily: 'Syne', fontSize: 16, fontWeight: FontWeight.w700, color: textP)),
                    Text(device['device_id'] ?? '',
                        style: TextStyle(fontFamily: 'Syne', fontSize: 12, color: textS)),
                  ],
                ),
              ),
              // Active toggle
              Switch(
                value: isActive,
                onChanged: (_) => onToggleActive(),
                activeThumbColor: AppColors.success,
              ),
            ],
          ),

          if (plate != null || battery != null) ...[
            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 14),
            Row(
              children: [
                if (plate != null) ...[
                  Icon(Iconsax.car, size: 14, color: textS),
                  const SizedBox(width: 6),
                  Text(plate,
                      style: const TextStyle(
                          fontFamily: 'Syne',
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.5,
                          color: AppColors.accent)),
                  const Spacer(),
                ],
                if (battery != null) ...[
                  Icon(Iconsax.battery_charging, size: 14, color: textS),
                  const SizedBox(width: 4),
                  Text('$battery%', style: TextStyle(fontFamily: 'Syne', fontSize: 13, color: textS)),
                ],
              ],
            ),
          ],

          const SizedBox(height: 14),

          // Unpair button
          SizedBox(
            width: double.infinity,
            height: 38,
            child: OutlinedButton.icon(
              onPressed: onUnpair,
              icon: const Icon(Icons.link_off, size: 14),
              label: const Text('Unpair Device',
                  style: TextStyle(fontFamily: 'Syne', fontSize: 12, fontWeight: FontWeight.w600)),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                minimumSize: Size.zero,
                side: BorderSide(color: AppColors.primary.withValues(alpha: 0.4)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
