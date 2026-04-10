import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import '../../../theme/app_colors.dart';
import '../../../supabase/supabase_client.dart';

class IncidentDetailScreen extends StatefulWidget {
  final String? incidentId;
  const IncidentDetailScreen({super.key, this.incidentId});

  @override
  State<IncidentDetailScreen> createState() => _IncidentDetailScreenState();
}

class _IncidentDetailScreenState extends State<IncidentDetailScreen> {
  Map<String, dynamic>? _incident;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (widget.incidentId == null) return;
    final data = await supabase
        .from('incidents')
        .select()
        .eq('id', widget.incidentId!)
        .maybeSingle();
    if (mounted) setState(() { _incident = data; _isLoading = false; });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: bg,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: const Icon(Iconsax.arrow_left_2),
        ),
        title: Text('Incident Details',
            style: TextStyle(fontFamily: 'Syne', fontWeight: FontWeight.w700, color: textP)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _incident == null
              ? Center(child: Text('Incident not found', style: TextStyle(fontFamily: 'Syne', color: textS)))
              : _buildDetail(isDark, textP, textS),
    );
  }

  Widget _buildDetail(bool isDark, Color textP, Color textS) {
    final i = _incident!;
    final status = i['status'] as String? ?? 'alert_sent';
    final createdAt = DateTime.tryParse(i['created_at'] ?? '')?.toLocal();
    final statusColor = _statusColor(status);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: statusColor.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                Icon(Iconsax.warning_2, color: statusColor, size: 28),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Crash Detected',
                          style: TextStyle(fontFamily: 'Syne', fontSize: 18, fontWeight: FontWeight.w800, color: textP)),
                      const SizedBox(height: 4),
                      Text(_statusLabel(status),
                          style: TextStyle(fontFamily: 'Syne', fontSize: 13, fontWeight: FontWeight.w600, color: statusColor)),
                    ],
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 400.ms),

          const SizedBox(height: 20),

          // Detail cards
          _DetailRow(icon: Iconsax.calendar, label: 'Date & Time',
              value: createdAt != null ? '${createdAt.day}/${createdAt.month}/${createdAt.year} at ${createdAt.hour}:${createdAt.minute.toString().padLeft(2, '0')}' : 'Unknown',
              isDark: isDark),
          const SizedBox(height: 10),
          if (i['g_force'] != null)
            _DetailRow(icon: Iconsax.danger, label: 'Impact Force',
                value: '${(i['g_force'] as double).toStringAsFixed(2)}G',
                isDark: isDark),
          const SizedBox(height: 10),
          if (i['latitude'] != null && i['longitude'] != null)
            _DetailRow(icon: Iconsax.location, label: 'Location',
                value: '${i['latitude']}, ${i['longitude']}',
                isDark: isDark),
          const SizedBox(height: 10),
          _DetailRow(icon: Iconsax.sms, label: 'SMS Sent',
              value: (i['sms_sent'] as bool? ?? false) ? 'Yes' : 'No',
              isDark: isDark),
          if (i['claimed_by'] != null) ...[
            const SizedBox(height: 10),
            _DetailRow(icon: Iconsax.people, label: 'Claimed By', value: i['claimed_by'], isDark: isDark),
          ],
        ],
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
      case 'alert_sent': return 'Alert Sent — Awaiting response';
      case 'cancelled': return 'Cancelled — No danger';
      case 'claimed': return 'Claimed — Help is coming';
      case 'resolved': return 'Resolved';
      default: return s;
    }
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool isDark;
  const _DetailRow({required this.icon, required this.label, required this.value, required this.isDark});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: TextStyle(fontFamily: 'Syne', fontSize: 11, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary)),
                  const SizedBox(height: 2),
                  Text(value, style: TextStyle(fontFamily: 'Syne', fontSize: 14, fontWeight: FontWeight.w700, color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary)),
                ],
              ),
            ),
          ],
        ),
      );
}
