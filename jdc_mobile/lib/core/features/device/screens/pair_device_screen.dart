import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import '../../../theme/app_colors.dart';
import '../../../supabase/supabase_client.dart';
import '../../../services/notification_service.dart';
import '../../auth/widgets/auth_field.dart';
import 'device_screen.dart';

class PairDeviceScreen extends ConsumerStatefulWidget {
  const PairDeviceScreen({super.key});

  @override
  ConsumerState<PairDeviceScreen> createState() => _PairDeviceScreenState();
}

class _PairDeviceScreenState extends ConsumerState<PairDeviceScreen> {
  final _formKey = GlobalKey<FormState>();
  final _deviceIdCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _plateCtrl = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _deviceIdCtrl.dispose();
    _nameCtrl.dispose();
    _plateCtrl.dispose();
    super.dispose();
  }

  Future<void> _pair() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final uid = supabase.auth.currentUser?.id;
    if (uid == null) return;

    try {
      await supabase.from('devices').upsert({
        'user_id': uid,
        'device_id': _deviceIdCtrl.text.trim().toUpperCase(),
        'device_name': _nameCtrl.text.trim().isEmpty
            ? 'JDC Device'
            : _nameCtrl.text.trim(),
        'vehicle_plate': _plateCtrl.text.trim().isNotEmpty
            ? _plateCtrl.text.trim().toUpperCase()
            : null,
        'is_active': true,
      }, onConflict: 'device_id');

      // Re-register FCM token after pairing so backend can push crash alerts to this phone
      await NotificationService.instance.refreshToken();

      ref.invalidate(deviceListProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Device paired! Crash alerts will be sent to this phone.'),
            backgroundColor: AppColors.success,
            duration: Duration(seconds: 3),
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.primary),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
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
        title: Text('Pair a Device',
            style: TextStyle(fontFamily: 'Syne', fontWeight: FontWeight.w700, color: textP)),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Hero icon
                Center(
                  child: Container(
                    width: 90, height: 90,
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.3),
                        blurRadius: 25, offset: const Offset(0, 10),
                      )],
                    ),
                    child: const Icon(Iconsax.bluetooth, size: 40, color: Colors.white),
                  ),
                ).animate().scale(delay: 50.ms, duration: 400.ms, curve: Curves.easeOutBack),

                const SizedBox(height: 32),

                JdcTextField(
                  controller: _deviceIdCtrl,
                  label: 'Device ID *',
                  hint: 'JDC-ESP-007',
                  prefixIcon: const Icon(Iconsax.cpu),
                  textCapitalization: TextCapitalization.characters,
                  validator: (v) => (v == null || v.isEmpty) ? 'Device ID is required' : null,
                ).animate().fadeIn(delay: 100.ms, duration: 400.ms),

                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Text(
                    'Printed on your JDC device or packaging box.',
                    style: TextStyle(fontFamily: 'Syne', fontSize: 12,
                        color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary),
                  ),
                ),

                const SizedBox(height: 16),

                JdcTextField(
                  controller: _nameCtrl,
                  label: 'Device Name (Optional)',
                  hint: 'My Car JDC',
                  prefixIcon: const Icon(Iconsax.tag),
                  textCapitalization: TextCapitalization.words,
                ).animate().fadeIn(delay: 150.ms, duration: 400.ms),

                const SizedBox(height: 16),

                JdcTextField(
                  controller: _plateCtrl,
                  label: 'Vehicle Plate No. (Optional)',
                  hint: 'MH-12-AB-1234',
                  prefixIcon: const Icon(Iconsax.car),
                  textCapitalization: TextCapitalization.characters,
                ).animate().fadeIn(delay: 200.ms, duration: 400.ms),

                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Text(
                    'Shared with emergency responders during crash alerts.',
                    style: TextStyle(fontFamily: 'Syne', fontSize: 12,
                        color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary),
                  ),
                ),

                const SizedBox(height: 32),

                JdcPrimaryButton(
                  label: 'Pair Device',
                  icon: Iconsax.bluetooth,
                  isLoading: _isLoading,
                  onPressed: _pair,
                ).animate().fadeIn(delay: 300.ms, duration: 400.ms),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

