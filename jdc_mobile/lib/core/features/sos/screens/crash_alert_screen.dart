import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import '../../../theme/app_colors.dart';
import '../../../supabase/supabase_client.dart';

class CrashAlertScreen extends StatefulWidget {
  final String incidentId;
  final double latitude;
  final double longitude;

  const CrashAlertScreen({
    super.key,
    required this.incidentId,
    required this.latitude,
    required this.longitude,
  });

  @override
  State<CrashAlertScreen> createState() => _CrashAlertScreenState();
}

class _CrashAlertScreenState extends State<CrashAlertScreen>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _countdownController;
  int _countdown = 15;
  Timer? _timer;
  bool _isCancelling = false;
  bool _hasCancelled = false;
  bool _hasDispatched = false;

  // User + device info loaded on init
  Map<String, dynamic>? _userProfile;
  Map<String, dynamic>? _device;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _countdownController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 15),
    )..forward();

    _startCountdown();
    _loadUserProfile(); // Fetch user details for passing to hospital/ambulance
  }

  // ── Load the current user's profile + paired device ─────────────────────────
  Future<void> _loadUserProfile() async {
    final uid = supabase.auth.currentUser?.id;
    if (uid == null) return;

    try {
      // Fetch full profile
      final profile = await supabase
          .from('users')
          .select('full_name, phone, blood_group')
          .eq('id', uid)
          .maybeSingle();

      // Fetch paired device (for vehicle_plate)
      final device = await supabase
          .from('devices')
          .select('device_id, device_name, vehicle_plate')
          .eq('user_id', uid)
          .eq('is_active', true)
          .maybeSingle();

      if (mounted) {
        setState(() {
          _userProfile = profile;
          _device = device;
        });
      }

      // Once profile is loaded, update the crash record to include user details
      if (widget.incidentId.isNotEmpty) {
        await supabase.from('crashes').update({
          'user_id': uid,
          'user_name': profile?['full_name'],
          'user_phone': profile?['phone'],
          'user_blood_group': profile?['blood_group'],
          'vehicle_plate': device?['vehicle_plate'],
        }).eq('id', widget.incidentId);
      }
    } catch (e) {
      debugPrint('Failed to load user profile for crash: $e');
    }
  }

  void _startCountdown() {
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      setState(() => _countdown--);
      if (_countdown <= 0) {
        t.cancel();
        _onAutoSOS();
      }
    });
  }

  // ── Auto-dispatch when countdown reaches 0 ──────────────────────────────────
  Future<void> _onAutoSOS() async {
    if (!mounted || _hasCancelled || _hasDispatched) return;
    setState(() => _hasDispatched = true);

    final user = supabase.auth.currentUser;
    final userName = _userProfile?['full_name'] ?? user?.userMetadata?['full_name'] ?? 'JDC User';
    final userPhone = _userProfile?['phone'] ?? user?.phone ?? '';
    final bloodGroup = _userProfile?['blood_group'] ?? '';
    final vehiclePlate = _device?['vehicle_plate'] ?? '';
    final deviceId = _device?['device_id'] ?? 'SOS-MOBILE';

    final String backendUrl = Platform.isAndroid
        ? 'http://192.168.0.103:3001/api/emergency/alert' // Changed from 10.0.2.2 to physical device Wi-Fi IP
        : 'http://localhost:3001/api/emergency/alert';

    try {
      // 1. Trigger Twilio emergency alerts with full user info
      await http.post(
        Uri.parse(backendUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': user?.id,
          'severity': 'high',
          'lat': widget.latitude,
          'lng': widget.longitude,
          'device_id': deviceId,
          'userName': userName,
          'userPhone': userPhone,
          'bloodGroup': bloodGroup,
          'vehiclePlate': vehiclePlate,
          'isAutoDispatch': true,
          'countdown': 15,
        }),
      );
    } catch (e) {
      debugPrint('Failed to trigger Twilio backend SOS: $e');
    }

    // 2. Update crash record to 'responding' + add all victim details
    try {
      await supabase.from('crashes').update({
        'status': 'responding',
        'responded_at': DateTime.now().toIso8601String(),
        'responded_by_hospital': 'AUTO-DISPATCH (15s timeout)',
        // Ensure user info is set (in case _loadUserProfile was slow)
        'user_id': user?.id,
        'user_name': userName,
        'user_phone': userPhone,
        'user_blood_group': bloodGroup,
        'vehicle_plate': vehiclePlate,
      }).eq('id', widget.incidentId);
    } catch (e) {
      debugPrint('Failed to update crash status: $e');
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('🚑 Ambulance auto-dispatched! Emergency contacts notified.'),
          backgroundColor: AppColors.primary,
          duration: Duration(seconds: 5),
        ),
      );
    }
  }

  // ── I'm OK — cancel the alert ────────────────────────────────────────────────
  Future<void> _cancelAlert() async {
    setState(() => _isCancelling = true);
    _timer?.cancel();

    try {
      await supabase.from('crashes').update({
        'status': 'cancelled',
        'resolved_at': DateTime.now().toIso8601String(),
      }).eq('id', widget.incidentId);
    } catch (e) {
        debugPrint('Cancellation update failed: $e');
    }

    if (mounted) {
      setState(() { _hasCancelled = true; _isCancelling = false; });
      await Future.delayed(const Duration(milliseconds: 800));
      if (mounted) context.go('/');
    }
  }

  Future<void> _triggerSOSNow() async {
    _timer?.cancel();
    setState(() => _countdown = 0);
    await _onAutoSOS();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _countdownController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final userName = _userProfile?['full_name'] ?? 
        supabase.auth.currentUser?.userMetadata?['full_name'] ?? 'User';
    final bloodGroup = _userProfile?['blood_group'] as String?;
    final vehiclePlate = _device?['vehicle_plate'] as String?;

    if (_hasCancelled) {
      return const Scaffold(
        backgroundColor: AppColors.darkBackground,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Iconsax.tick_circle, color: AppColors.success, size: 80),
              SizedBox(height: 20),
              Text('Alert Cancelled',
                  style: TextStyle(
                      fontFamily: 'Syne',
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.success)),
              SizedBox(height: 8),
              Text('Glad you\'re safe!',
                  style: TextStyle(fontFamily: 'Syne', fontSize: 14, color: AppColors.darkTextSecondary)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: Container(
        width: size.width,
        height: size.height,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF1A0005), Color(0xFF0A0A0F)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: size.height - MediaQuery.of(context).padding.top - MediaQuery.of(context).padding.bottom),
              child: IntrinsicHeight(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(height: 32),

                    // ── Pulsing Alert Icon ──────────────────────────────────
                    AnimatedBuilder(
                      animation: _pulseController,
                      builder: (_, __) {
                        return Stack(
                          alignment: Alignment.center,
                          children: [
                            Container(
                              width: 180 + (_pulseController.value * 40),
                              height: 180 + (_pulseController.value * 40),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.primary.withValues(
                                    alpha: 0.08 * (1 - _pulseController.value)),
                              ),
                            ),
                            Container(
                              width: 140 + (_pulseController.value * 20),
                              height: 140 + (_pulseController.value * 20),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.primary.withValues(
                                    alpha: 0.15 * (1 - _pulseController.value)),
                              ),
                            ),
                            Container(
                              width: 120,
                              height: 120,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.primary,
                              ),
                              child: const Icon(Iconsax.warning_2, size: 60, color: Colors.white),
                            ),
                          ],
                        );
                      },
                    ).animate().scale(delay: 100.ms, duration: 500.ms, curve: Curves.easeOutBack),

                    const SizedBox(height: 32),

                    // ── Title ────────────────────────────────────────────────
                    Text(
                      _hasDispatched ? '🚑 AMBULANCE DISPATCHED' : '🚨 CRASH DETECTED',
                      style: const TextStyle(
                        fontFamily: 'Syne',
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: 0.5,
                      ),
                    ).animate().fadeIn(delay: 200.ms),

                    const SizedBox(height: 8),

                    Text(
                      _hasDispatched
                          ? 'Emergency contacts have been notified & help is on the way.\nIf you are safe, please cancel the alert.'
                          : 'Are you okay?\nAmbulance will be auto-dispatched in 15 seconds.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: 'Syne',
                        fontSize: 15,
                        color: AppColors.darkTextSecondary,
                        height: 1.5,
                      ),
                    ).animate().fadeIn(delay: 300.ms),

                    const SizedBox(height: 20),

                    // ── User Info Card (shown to hospital/ambulance) ──────────
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 28),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.06),
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: const BoxDecoration(
                                    color: AppColors.primaryContainer,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
                                      style: const TextStyle(
                                        fontFamily: 'Syne',
                                        fontSize: 18,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        userName,
                                        style: const TextStyle(
                                          fontFamily: 'Syne',
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${widget.latitude.toStringAsFixed(5)}, ${widget.longitude.toStringAsFixed(5)}',
                                        style: const TextStyle(
                                          fontFamily: 'Syne',
                                          fontSize: 11,
                                          color: AppColors.darkTextTertiary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            if (bloodGroup != null || vehiclePlate != null) ...[
                              const SizedBox(height: 10),
                              const Divider(color: Colors.white12, height: 1),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  if (bloodGroup != null)
                                    _InfoChip(
                                      icon: Iconsax.drop,
                                      label: bloodGroup,
                                      color: AppColors.primary,
                                    ),
                                  if (bloodGroup != null && vehiclePlate != null)
                                    const SizedBox(width: 8),
                                  if (vehiclePlate != null)
                                    _InfoChip(
                                      icon: Iconsax.car,
                                      label: vehiclePlate,
                                      color: AppColors.accent,
                                    ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    ).animate().fadeIn(delay: 350.ms),

                    const SizedBox(height: 24),

                    // ── Countdown or Broadcasting State ───────────────────────
                    if (!_hasDispatched)
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          SizedBox(
                            width: 90,
                            height: 90,
                            child: AnimatedBuilder(
                              animation: _countdownController,
                              builder: (_, __) => CircularProgressIndicator(
                                value: 1 - _countdownController.value,
                                strokeWidth: 5,
                                backgroundColor: AppColors.darkSurface3,
                                valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                              ),
                            ),
                          ),
                          Column(
                            children: [
                              Text(
                                '$_countdown',
                                style: const TextStyle(
                                  fontFamily: 'Syne',
                                  fontSize: 32,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                ),
                              ),
                              const Text(
                                's',
                                style: TextStyle(
                                  fontFamily: 'Syne',
                                  fontSize: 12,
                                  color: AppColors.darkTextSecondary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ).animate().fadeIn(delay: 400.ms)
                    else
                      Column(
                        children: [
                          const SizedBox(height: 10),
                          const Icon(Iconsax.radar5, color: AppColors.primary, size: 50)
                              .animate(onPlay: (controller) => controller.repeat())
                              .shimmer(duration: 1500.ms, color: Colors.white),
                          const SizedBox(height: 12),
                          const Text(
                            'Broadcasting Live Location...',
                            style: TextStyle(
                              fontFamily: 'Syne',
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ).animate().fadeIn(),
                        ],
                      ),

                    const SizedBox(height: 36),

                    // ── Buttons ───────────────────────────────────────────────
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Column(
                        children: [
                          SizedBox(
                            width: double.infinity,
                            height: 58,
                            child: ElevatedButton.icon(
                              onPressed: _isCancelling ? null : _cancelAlert,
                              icon: _isCancelling
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                  : const Icon(Iconsax.tick_circle, size: 20),
                              label: Text(
                                _isCancelling ? 'Cancelling...' : "I'm OK — Cancel Alert",
                                style: const TextStyle(
                                  fontFamily: 'Syne',
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.success,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                elevation: 0,
                              ),
                            ),
                          ).animate().slideY(begin: 0.2, end: 0, delay: 500.ms, duration: 400.ms).fadeIn(delay: 500.ms),

                          if (!_hasDispatched) ...[
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              height: 58,
                              child: OutlinedButton.icon(
                                onPressed: _triggerSOSNow,
                                icon: const Icon(Iconsax.radar5, size: 20, color: AppColors.primary),
                                label: const Text(
                                  'Trigger SOS Now',
                                  style: TextStyle(
                                    fontFamily: 'Syne',
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primary,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: AppColors.primary, width: 1.5),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                ),
                              ),
                            ).animate().slideY(begin: 0.2, end: 0, delay: 600.ms, duration: 400.ms).fadeIn(delay: 600.ms),
                          ],
                        ],
                      ),
                    ),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Small info chip ───────────────────────────────────────────────────────────
class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _InfoChip({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'Syne',
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: color,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      );
}
