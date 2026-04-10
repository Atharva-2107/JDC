import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import '../../../theme/app_colors.dart';
import '../../../supabase/supabase_client.dart';
import '../../auth/widgets/auth_field.dart';
import 'contacts_screen.dart';

class AddContactScreen extends ConsumerStatefulWidget {
  const AddContactScreen({super.key});

  @override
  ConsumerState<AddContactScreen> createState() => _AddContactScreenState();
}

class _AddContactScreenState extends ConsumerState<AddContactScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  String _relation = 'Family';
  bool _isLoading = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final uid = supabase.auth.currentUser?.id;
    if (uid == null) return;

    try {
      // Get current max priority for this user
      final existing = await supabase
          .from('emergency_contacts')
          .select('priority')
          .eq('user_id', uid)
          .order('priority', ascending: false)
          .limit(1);

      final nextPriority = existing.isEmpty ? 1 : ((existing[0]['priority'] as int) + 1);

      await supabase.from('emergency_contacts').insert({
        'user_id': uid,
        'full_name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'relation': _relation,
        'priority': nextPriority,
        'notify_sms': true,
      });

      ref.invalidate(contactsProvider);
      if (mounted) context.pop();
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
        title: Text('Add Contact',
            style: TextStyle(
                fontFamily: 'Syne', fontWeight: FontWeight.w700, color: textP)),
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
                    width: 80,
                    height: 80,
                    decoration: const BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Iconsax.people, size: 36, color: Colors.white),
                  ),
                ).animate().scale(delay: 50.ms, duration: 400.ms, curve: Curves.easeOutBack),

                const SizedBox(height: 32),

                JdcTextField(
                  controller: _nameCtrl,
                  label: 'Full Name',
                  hint: 'Jane Doe',
                  prefixIcon: const Icon(Iconsax.user),
                  textCapitalization: TextCapitalization.words,
                  validator: (v) => (v == null || v.isEmpty) ? 'Name is required' : null,
                ).animate().fadeIn(delay: 100.ms, duration: 400.ms),

                const SizedBox(height: 16),

                JdcTextField(
                  controller: _phoneCtrl,
                  label: 'Phone Number',
                  hint: '98765 43210',
                  prefixIcon: const Icon(Iconsax.call),
                  keyboardType: TextInputType.phone,
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Phone number is required';
                    if (v.replaceAll(' ', '').length < 10) return 'Enter a valid phone number';
                    return null;
                  },
                ).animate().fadeIn(delay: 150.ms, duration: 400.ms),

                const SizedBox(height: 24),

                Text('Relationship',
                    style: TextStyle(
                        fontFamily: 'Syne',
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: textS))
                    .animate().fadeIn(delay: 200.ms),

                const SizedBox(height: 10),

                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: ['Family', 'Spouse', 'Friend', 'Doctor', 'Other']
                      .map((r) => GestureDetector(
                            onTap: () => setState(() => _relation = r),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 10),
                              decoration: BoxDecoration(
                                color: _relation == r
                                    ? AppColors.primaryContainer
                                    : (isDark ? AppColors.darkSurface2 : AppColors.lightSurface),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: _relation == r
                                      ? AppColors.primary
                                      : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                                  width: _relation == r ? 1.5 : 1,
                                ),
                              ),
                              child: Text(r,
                                  style: TextStyle(
                                    fontFamily: 'Syne',
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: _relation == r
                                        ? AppColors.primary
                                        : textS,
                                  )),
                            ),
                          ))
                      .toList(),
                ).animate().fadeIn(delay: 220.ms, duration: 400.ms),

                const SizedBox(height: 32),

                JdcPrimaryButton(
                  label: 'Save Contact',
                  icon: Iconsax.tick_circle,
                  isLoading: _isLoading,
                  onPressed: _save,
                ).animate().fadeIn(delay: 300.ms, duration: 400.ms),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

