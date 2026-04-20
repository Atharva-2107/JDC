import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import '../../../theme/app_colors.dart';
import '../../../supabase/supabase_client.dart';
import '../../../features/auth/widgets/auth_field.dart';
import '../../dashboard/screens/dashboard_screen.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _medNotesCtrl = TextEditingController();
  String _bloodGroup = '';
  String _gender = '';
  bool _isLoading = false;
  bool _isSaved = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final uid = supabase.auth.currentUser?.id;
    if (uid == null) return;
    final data = await supabase.from('users').select().eq('id', uid).maybeSingle();
    if (data != null && mounted) {
      setState(() {
        _nameCtrl.text = data['full_name'] ?? '';
        _phoneCtrl.text = data['phone'] ?? '';
        _medNotesCtrl.text = data['medical_notes'] ?? '';
        _bloodGroup = data['blood_group'] ?? '';
        _gender = data['gender'] ?? '';
      });
    }
  }

  Future<void> _save() async {
    setState(() => _isLoading = true);
    final uid = supabase.auth.currentUser?.id;
    if (uid == null) return;
    try {
      await supabase.from('users').upsert({
        'id': uid,
        'full_name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'medical_notes': _medNotesCtrl.text.trim(),
        'blood_group': _bloodGroup.isNotEmpty ? _bloodGroup : null,
        'gender': _gender.isNotEmpty ? _gender.toLowerCase() : null,
      }, onConflict: 'id');

      ref.invalidate(userProfileProvider);
      if (mounted) {
        setState(() => _isSaved = true);
        await Future.delayed(const Duration(milliseconds: 800));
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
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _medNotesCtrl.dispose();
    super.dispose();
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
        title: Text('Edit Profile',
            style: TextStyle(
                fontFamily: 'Syne',
                fontWeight: FontWeight.w700,
                color: textP)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 8),

              JdcTextField(
                controller: _nameCtrl,
                label: 'Full Name',
                hint: 'Your full name',
                prefixIcon: const Icon(Iconsax.user),
                textCapitalization: TextCapitalization.words,
              ).animate().fadeIn(delay: 100.ms),

              const SizedBox(height: 16),

              JdcTextField(
                controller: _phoneCtrl,
                label: 'Phone Number',
                hint: '+91 98765 43210',
                prefixIcon: const Icon(Iconsax.call),
                keyboardType: TextInputType.phone,
              ).animate().fadeIn(delay: 150.ms),

              const SizedBox(height: 20),

              _Label('Blood Group', textS),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']
                    .map((bg) => _Chip(
                          label: bg,
                          isSelected: _bloodGroup == bg,
                          isDark: isDark,
                          onTap: () => setState(() => _bloodGroup = bg),
                        ))
                    .toList(),
              ).animate().fadeIn(delay: 200.ms),

              const SizedBox(height: 20),

              _Label('Gender', textS),
              const SizedBox(height: 8),
              Row(
                children: ['Male', 'Female', 'Other']
                    .map((g) => Expanded(
                          child: Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: _Chip(
                              label: g,
                              isSelected: _gender == g,
                              isDark: isDark,
                              onTap: () => setState(() => _gender = g),
                            ),
                          ),
                        ))
                    .toList(),
              ).animate().fadeIn(delay: 250.ms),

              const SizedBox(height: 20),

              _Label('Medical Notes', textS),
              const SizedBox(height: 8),
              TextFormField(
                controller: _medNotesCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'e.g. Diabetic, allergic to penicillin...',
                  hintStyle: TextStyle(
                      fontFamily: 'Syne',
                      fontSize: 13,
                      color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary),
                ),
                style: TextStyle(
                    fontFamily: 'Syne',
                    fontSize: 14,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
              ).animate().fadeIn(delay: 300.ms),

              const SizedBox(height: 32),

              JdcPrimaryButton(
                label: _isSaved ? 'Saved!' : 'Save Changes',
                icon: _isSaved ? Iconsax.tick_circle : Iconsax.save_2,
                isLoading: _isLoading,
                onPressed: _save,
              ).animate().fadeIn(delay: 350.ms),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  final Color color;
  const _Label(this.text, this.color);
  @override
  Widget build(BuildContext context) => Text(text,
      style: TextStyle(
          fontFamily: 'Syne',
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: color));
}

class _Chip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;
  const _Chip({required this.label, required this.isSelected, required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primaryContainer : (isDark ? AppColors.darkSurface2 : AppColors.lightSurface),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.primary : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Text(label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Syne',
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isSelected ? AppColors.primary : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
              )),
        ),
      );
}

