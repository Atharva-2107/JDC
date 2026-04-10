import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../router/app_router.dart';
import '../../theme/app_colors.dart';
import '../auth/widgets/auth_field.dart';
import 'setup_provider.dart';

class SetupWizardScreen extends ConsumerStatefulWidget {
  const SetupWizardScreen({super.key});

  @override
  ConsumerState<SetupWizardScreen> createState() => _SetupWizardScreenState();
}

class _SetupWizardScreenState extends ConsumerState<SetupWizardScreen> {
  final _pageController = PageController();
  int _currentStep = 0;
  final _totalSteps = 3;

  // Step 1
  final _nameCtrl = TextEditingController();
  String _bloodGroup = '';
  String _gender = '';
  XFile? _photo;

  // Step 2
  final _contactNameCtrl = TextEditingController();
  final _contactPhoneCtrl = TextEditingController();
  String _contactRelation = 'Family';

  // Step 3
  final _deviceIdCtrl = TextEditingController();
  final _plateCtrl = TextEditingController();

  @override
  void dispose() {
    _pageController.dispose();
    _nameCtrl.dispose();
    _contactNameCtrl.dispose();
    _contactPhoneCtrl.dispose();
    _deviceIdCtrl.dispose();
    _plateCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final img = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (img != null) setState(() => _photo = img);
  }

  void _nextStep() {
    if (_currentStep < _totalSteps - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      _submit();
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _submit() async {
    final notifier = ref.read(setupProvider.notifier);
    notifier.updateProfile(
      fullName: _nameCtrl.text.trim(),
      bloodGroup: _bloodGroup,
      gender: _gender,
      profilePhoto: _photo,
    );
    notifier.updateContact(
      name: _contactNameCtrl.text.trim(),
      phone: _contactPhoneCtrl.text.trim(),
      relation: _contactRelation,
    );
    notifier.updateDevice(
      deviceId: _deviceIdCtrl.text.trim(),
      vehiclePlate: _plateCtrl.text.trim(),
    );

    final success = await notifier.submitAll();
    if (success && mounted) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('hasCompletedSetup', true);
      context.go(AppRoutes.home);
    }
  }

  Future<void> _skipSetup() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('hasCompletedSetup', true);
    if (mounted) context.go(AppRoutes.home);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final setupState = ref.watch(setupProvider);
    final isLoading = setupState.status == SetupStatus.loading;

    ref.listen(setupProvider, (_, next) {
      if (next.status == SetupStatus.error && next.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.errorMessage!), backgroundColor: AppColors.primary),
        );
      }
    });

    final stepTitles = ['Your Profile', 'Emergency Contact', 'Pair Your Device'];
    final stepSubtitles = [
      'Tell us a bit about yourself',
      'Who should we call in an emergency?',
      'Link your JDC hardware to your account',
    ];

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Column(
          children: [
            // ── Header ─────────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Step counter
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.primaryContainer,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'Step ${_currentStep + 1} of $_totalSteps',
                          style: const TextStyle(
                            fontFamily: 'Syne',
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: _skipSetup,
                        child: Text('Skip for now',
                            style: TextStyle(
                                color: textS,
                                fontFamily: 'Syne',
                                fontWeight: FontWeight.w500,
                                fontSize: 13)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Progress bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: (_currentStep + 1) / _totalSteps,
                      backgroundColor: isDark ? AppColors.darkSurface3 : AppColors.lightSurface3,
                      valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                      minHeight: 4,
                    ),
                  ),
                  const SizedBox(height: 28),

                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: Column(
                      key: ValueKey(_currentStep),
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stepTitles[_currentStep],
                          style: TextStyle(
                            fontFamily: 'Syne',
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            color: textP,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          stepSubtitles[_currentStep],
                          style: TextStyle(
                              fontFamily: 'Syne',
                              fontSize: 14,
                              color: textS,
                              fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // ── Step Pages ──────────────────────────────────────────────────
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (i) => setState(() => _currentStep = i),
                children: [
                  _Step1Profile(
                    isDark: isDark,
                    nameCtrl: _nameCtrl,
                    bloodGroup: _bloodGroup,
                    gender: _gender,
                    photo: _photo,
                    onPickPhoto: _pickPhoto,
                    onBloodGroupChanged: (v) => setState(() => _bloodGroup = v),
                    onGenderChanged: (v) => setState(() => _gender = v),
                  ),
                  _Step2Contact(
                    isDark: isDark,
                    nameCtrl: _contactNameCtrl,
                    phoneCtrl: _contactPhoneCtrl,
                    relation: _contactRelation,
                    onRelationChanged: (v) => setState(() => _contactRelation = v),
                  ),
                  _Step3Device(
                    isDark: isDark,
                    deviceIdCtrl: _deviceIdCtrl,
                    plateCtrl: _plateCtrl,
                  ),
                ],
              ),
            ),

            // ── Bottom Buttons ──────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              child: Row(
                children: [
                  if (_currentStep > 0) ...[
                    SizedBox(
                      height: 54,
                      width: 54,
                      child: OutlinedButton(
                        onPressed: _previousStep,
                        style: OutlinedButton.styleFrom(
                          minimumSize: Size.zero,
                          padding: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                          side: BorderSide(
                              color: isDark ? AppColors.darkBorderBright : AppColors.lightBorderBright),
                        ),
                        child: const Icon(Iconsax.arrow_left_2, size: 20),
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: JdcPrimaryButton(
                      label: _currentStep == _totalSteps - 1 ? 'Complete Setup' : 'Continue',
                      icon: _currentStep == _totalSteps - 1 ? Iconsax.tick_circle : null,
                      isLoading: isLoading,
                      onPressed: _nextStep,
                    ),
                  ),
                ],
              ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
            ),
          ],
        ),
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// STEP 1: Profile
// ──────────────────────────────────────────────────────────────────────────────
class _Step1Profile extends StatelessWidget {
  final bool isDark;
  final TextEditingController nameCtrl;
  final String bloodGroup;
  final String gender;
  final XFile? photo;
  final VoidCallback onPickPhoto;
  final void Function(String) onBloodGroupChanged;
  final void Function(String) onGenderChanged;

  const _Step1Profile({
    required this.isDark,
    required this.nameCtrl,
    required this.bloodGroup,
    required this.gender,
    required this.photo,
    required this.onPickPhoto,
    required this.onBloodGroupChanged,
    required this.onGenderChanged,
  });

  @override
  Widget build(BuildContext context) {
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final surface = isDark ? AppColors.darkSurface2 : AppColors.lightSurface;
    final border = isDark ? AppColors.darkBorder : AppColors.lightBorder;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Photo picker
          Center(
            child: GestureDetector(
              onTap: onPickPhoto,
              child: Stack(
                children: [
                  CircleAvatar(
                    radius: 48,
                    backgroundColor: isDark ? AppColors.darkSurface3 : AppColors.lightSurface3,
                    backgroundImage: photo != null ? FileImage(File(photo!.path)) : null,
                    child: photo == null
                        ? Icon(Iconsax.user, size: 40,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary)
                        : null,
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Iconsax.camera, size: 14, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ).animate().scale(delay: 100.ms, duration: 400.ms),

          const SizedBox(height: 24),

          // Full name
          JdcTextField(
            controller: nameCtrl,
            label: 'Full Name',
            hint: 'John Doe',
            prefixIcon: const Icon(Iconsax.user),
            textCapitalization: TextCapitalization.words,
          ).animate().slideY(begin: 0.1, end: 0, delay: 150.ms, duration: 400.ms).fadeIn(delay: 150.ms),

          const SizedBox(height: 16),

          // Blood group
          _SectionLabel('Blood Group', textS),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']
                .map((bg) => _OptionChip(
                      label: bg,
                      isSelected: bloodGroup == bg,
                      isDark: isDark,
                      onTap: () => onBloodGroupChanged(bg),
                    ))
                .toList(),
          ).animate().fadeIn(delay: 200.ms, duration: 400.ms),

          const SizedBox(height: 20),

          // Gender
          _SectionLabel('Gender', textS),
          const SizedBox(height: 8),
          Row(
            children: ['Male', 'Female', 'Other']
                .map((g) => Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: _OptionChip(
                          label: g,
                          isSelected: gender == g,
                          isDark: isDark,
                          onTap: () => onGenderChanged(g),
                        ),
                      ),
                    ))
                .toList(),
          ).animate().fadeIn(delay: 250.ms, duration: 400.ms),

          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// STEP 2: Emergency Contact
// ──────────────────────────────────────────────────────────────────────────────
class _Step2Contact extends StatelessWidget {
  final bool isDark;
  final TextEditingController nameCtrl;
  final TextEditingController phoneCtrl;
  final String relation;
  final void Function(String) onRelationChanged;

  const _Step2Contact({
    required this.isDark,
    required this.nameCtrl,
    required this.phoneCtrl,
    required this.relation,
    required this.onRelationChanged,
  });

  @override
  Widget build(BuildContext context) {
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Info box
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.accentContainer,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.accent.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(Iconsax.information, color: AppColors.accent, size: 18),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'This person will be notified instantly when a crash is detected.',
                    style: TextStyle(
                      fontFamily: 'Syne',
                      fontSize: 13,
                      color: AppColors.accent.withValues(alpha: 0.9),
                    ),
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: 100.ms, duration: 400.ms),

          const SizedBox(height: 24),

          JdcTextField(
            controller: nameCtrl,
            label: 'Contact Name',
            hint: 'Jane Doe',
            prefixIcon: const Icon(Iconsax.user),
            textCapitalization: TextCapitalization.words,
          ).animate().slideY(begin: 0.1, end: 0, delay: 150.ms, duration: 400.ms).fadeIn(delay: 150.ms),

          const SizedBox(height: 16),

          JdcTextField(
            controller: phoneCtrl,
            label: 'Phone Number',
            hint: '98765 43210',
            prefixIcon: const Icon(Iconsax.call),
            keyboardType: TextInputType.phone,
          ).animate().slideY(begin: 0.1, end: 0, delay: 200.ms, duration: 400.ms).fadeIn(delay: 200.ms),

          const SizedBox(height: 20),

          _SectionLabel('Relationship', textS),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: ['Family', 'Spouse', 'Friend', 'Doctor', 'Other']
                .map((r) => _OptionChip(
                      label: r,
                      isSelected: relation == r,
                      isDark: isDark,
                      onTap: () => onRelationChanged(r),
                    ))
                .toList(),
          ).animate().fadeIn(delay: 250.ms, duration: 400.ms),
        ],
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// STEP 3: Device Pairing
// ──────────────────────────────────────────────────────────────────────────────
class _Step3Device extends StatelessWidget {
  final bool isDark;
  final TextEditingController deviceIdCtrl;
  final TextEditingController plateCtrl;

  const _Step3Device({
    required this.isDark,
    required this.deviceIdCtrl,
    required this.plateCtrl,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Device graphic
          Center(
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 30,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: const Icon(Iconsax.bluetooth, size: 44, color: Colors.white),
            ),
          ).animate().scale(delay: 100.ms, duration: 400.ms, curve: Curves.easeOutBack),

          const SizedBox(height: 28),

          JdcTextField(
            controller: deviceIdCtrl,
            label: 'JDC Device ID',
            hint: 'JDC-ESP-007',
            prefixIcon: const Icon(Iconsax.cpu),
            textCapitalization: TextCapitalization.characters,
          ).animate().slideY(begin: 0.1, end: 0, delay: 150.ms, duration: 400.ms).fadeIn(delay: 150.ms),

          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              'Find this printed on your JDC device hardware or packaging.',
              style: TextStyle(
                fontFamily: 'Syne',
                fontSize: 12,
                color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
              ),
            ),
          ),

          const SizedBox(height: 20),

          JdcTextField(
            controller: plateCtrl,
            label: 'Vehicle Plate Number',
            hint: 'MH-12-AB-1234',
            prefixIcon: const Icon(Iconsax.car),
            textCapitalization: TextCapitalization.characters,
          ).animate().slideY(begin: 0.1, end: 0, delay: 200.ms, duration: 400.ms).fadeIn(delay: 200.ms),

          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              'Your vehicle\'s registration number is shared to emergency responders during alerts.',
              style: TextStyle(
                fontFamily: 'Syne',
                fontSize: 12,
                color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Skip device hint
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.warningContainer,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
            ),
            child: const Row(
              children: [
                Icon(Iconsax.warning_2, color: AppColors.warning, size: 18),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'You can skip device pairing and do it later from the Device tab.',
                    style: TextStyle(
                      fontFamily: 'Syne',
                      fontSize: 13,
                      color: AppColors.warning,
                    ),
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: 250.ms, duration: 400.ms),
        ],
      ),
    );
  }
}

// ── Shared Widgets ─────────────────────────────────────────────────────────────
class _SectionLabel extends StatelessWidget {
  final String text;
  final Color color;
  const _SectionLabel(this.text, this.color);

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: TextStyle(
          fontFamily: 'Syne',
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      );
}

class _OptionChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;

  const _OptionChip({
    required this.label,
    required this.isSelected,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primaryContainer
              : (isDark ? AppColors.darkSurface2 : AppColors.lightSurface),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected
                ? AppColors.primary
                : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'Syne',
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isSelected
                ? AppColors.primary
                : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
          ),
        ),
      ),
    );
  }
}

