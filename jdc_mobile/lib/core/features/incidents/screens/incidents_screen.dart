import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import '../../../theme/app_colors.dart';
import '../../../supabase/supabase_client.dart';
import '../../dashboard/screens/dashboard_screen.dart';

class IncidentsScreen extends ConsumerWidget {
  const IncidentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    final incidentsAsync = ref.watch(recentIncidentsProvider);

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async => ref.invalidate(recentIncidentsProvider),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Incidents',
                          style: TextStyle(
                            fontFamily: 'Syne',
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            color: textP,
                            letterSpacing: -0.5,
                          )).animate().fadeIn(duration: 400.ms),
                      const SizedBox(height: 4),
                      Text('All crash events detected by your JDC device',
                          style: TextStyle(
                            fontFamily: 'Syne',
                            fontSize: 13,
                            color: textS,
                          )).animate().fadeIn(delay: 100.ms, duration: 400.ms),
                    ],
                  ),
                ),
              ),

              // Stats row
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: incidentsAsync.when(
                    loading: () => const SizedBox(),
                    error: (_, __) => const SizedBox(),
                    data: (incidents) {
                      final alertCount = incidents.where((i) => i['status'] == 'alert_sent').length;
                      final resolvedCount = incidents.where((i) => i['status'] == 'resolved').length;
                      return Row(
                        children: [
                          _StatCard(label: 'Total', count: incidents.length, color: textP, isDark: isDark),
                          const SizedBox(width: 10),
                          _StatCard(label: 'Active', count: alertCount, color: AppColors.primary, isDark: isDark),
                          const SizedBox(width: 10),
                          _StatCard(label: 'Resolved', count: resolvedCount, color: AppColors.success, isDark: isDark),
                        ],
                      );
                    },
                  ),
                ).animate().fadeIn(delay: 150.ms, duration: 400.ms),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 20)),

              // List
              incidentsAsync.when(
                loading: () => const SliverToBoxAdapter(
                  child: Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 60),
                      child: CircularProgressIndicator(color: AppColors.primary),
                    ),
                  ),
                ),
                error: (e, _) => SliverToBoxAdapter(
                  child: Center(child: Text('Error: $e')),
                ),
                data: (incidents) {
                  if (incidents.isEmpty) {
                    return SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(40),
                        child: Column(
                          children: [
                            Icon(Iconsax.shield_tick, size: 60,
                                color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary),
                            const SizedBox(height: 16),
                            Text('No incidents yet',
                                style: TextStyle(
                                    fontFamily: 'Syne',
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: textP)),
                            const SizedBox(height: 8),
                            Text('Your JDC device will log all crash events here.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    fontFamily: 'Syne',
                                    fontSize: 13,
                                    color: textS)),
                          ],
                        ),
                      ),
                    );
                  }
                  return SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) {
                        final incident = incidents[i] as Map<String, dynamic>;
                        return Padding(
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                          child: _IncidentCard(
                            incident: incident,
                            isDark: isDark,
                            onTap: () => context.go('/incidents/${incident['id']}'),
                          ),
                        ).animate().fadeIn(delay: Duration(milliseconds: 200 + i * 60), duration: 300.ms);
                      },
                      childCount: incidents.length,
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  final bool isDark;
  const _StatCard({required this.label, required this.count, required this.color, required this.isDark});

  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
          ),
          child: Column(
            children: [
              Text('$count',
                  style: TextStyle(
                    fontFamily: 'Syne',
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: color,
                  )),
              Text(label,
                  style: TextStyle(
                    fontFamily: 'Syne',
                    fontSize: 12,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  )),
            ],
          ),
        ),
      );
}

class _IncidentCard extends StatelessWidget {
  final Map<String, dynamic> incident;
  final bool isDark;
  final VoidCallback onTap;
  const _IncidentCard({required this.incident, required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final status = incident['status'] as String? ?? 'alert_sent';
    final gForce = incident['g_force'] as double?;
    final lat = incident['latitude'] as double?;
    final lng = incident['longitude'] as double?;
    final createdAt = DateTime.tryParse(incident['created_at'] ?? '')?.toLocal();
    final statusColor = _statusColor(status);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: status == 'alert_sent'
                ? AppColors.primary.withValues(alpha: 0.3)
                : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Iconsax.warning_2, color: statusColor, size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Crash Detected',
                          style: TextStyle(
                            fontFamily: 'Syne',
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                          )),
                      Text(
                        createdAt != null ? _formatDate(createdAt) : 'Unknown time',
                        style: TextStyle(
                            fontFamily: 'Syne',
                            fontSize: 12,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
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
                  child: Text(_statusLabel(status),
                      style: TextStyle(
                          fontFamily: 'Syne',
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: statusColor)),
                ),
              ],
            ),
            if (gForce != null || (lat != null && lng != null)) ...[
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 12),
              Row(
                children: [
                  if (gForce != null) ...[
                    Icon(Iconsax.danger, size: 14,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                    const SizedBox(width: 4),
                    Text('${gForce.toStringAsFixed(1)}G impact',
                        style: TextStyle(
                            fontFamily: 'Syne',
                            fontSize: 12,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary)),
                    const SizedBox(width: 16),
                  ],
                  if (lat != null && lng != null) ...[
                    Icon(Iconsax.location, size: 14,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                    const SizedBox(width: 4),
                    Text(
                      '${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}',
                      style: TextStyle(
                          fontFamily: 'Syne',
                          fontSize: 12,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                    ),
                  ],
                ],
              ),
            ],
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
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}
