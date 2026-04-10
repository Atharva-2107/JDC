import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../router/app_router.dart';
import '../../../theme/app_colors.dart';
import '../providers/auth_provider.dart';
import '../widgets/auth_field.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _showPhoneTab = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _loginEmail() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = ref.read(authProvider.notifier);
    final success = await auth.signInWithEmail(
      email: _emailCtrl.text.trim(),
      password: _passCtrl.text,
    );
    if (success && mounted) context.go(AppRoutes.home);
  }

  Future<void> _loginGoogle() async {
    final auth = ref.read(authProvider.notifier);
    final success = await auth.signInWithGoogle();
    if (success && mounted) context.go(AppRoutes.home);
  }

  Future<void> _sendOtp() async {
    final phone = '+91${_phoneCtrl.text.trim()}';
    if (_phoneCtrl.text.trim().length != 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid 10-digit mobile number')),
      );
      return;
    }
    final auth = ref.read(authProvider.notifier);
    final success = await auth.sendOtp(phone);
    if (success && mounted) {
      context.go('${AppRoutes.otp}?phone=${Uri.encodeComponent(phone)}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState.status == AuthStatus.loading;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;

    // Show error snackbar
    ref.listen(authProvider, (_, next) {
      if (next.status == AuthStatus.error && next.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.errorMessage!),
            backgroundColor: AppColors.primary,
          ),
        );
        ref.read(authProvider.notifier).clearError();
      }
    });

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 48),

              // Header
              const AuthHeader(
                title: 'Welcome\nback.',
                subtitle: 'Sign in to your JDC account to\nstay protected.',
              ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.1, end: 0),

              const SizedBox(height: 40),

              // Tab switcher
              _TabSwitcher(
                isPhone: _showPhoneTab,
                onChanged: (v) => setState(() => _showPhoneTab = v),
              ).animate().fadeIn(delay: 100.ms, duration: 400.ms),

              const SizedBox(height: 28),

              // Form
              Form(
                key: _formKey,
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: _showPhoneTab
                      ? _PhoneForm(
                          key: const ValueKey('phone'),
                          controller: _phoneCtrl,
                          isLoading: isLoading,
                          onSend: _sendOtp,
                        )
                      : _EmailForm(
                          key: const ValueKey('email'),
                          emailCtrl: _emailCtrl,
                          passCtrl: _passCtrl,
                          isLoading: isLoading,
                          onLogin: _loginEmail,
                        ),
                ),
              ).animate().fadeIn(delay: 150.ms, duration: 400.ms),

              const SizedBox(height: 32),

              // Divider
              const OrDivider()
                  .animate()
                  .fadeIn(delay: 200.ms, duration: 400.ms),

              const SizedBox(height: 24),

              // Google
              JdcSocialButton(
                label: 'Continue with Google',
                icon: _GoogleIcon(),
                onPressed: _loginGoogle,
                isLoading: isLoading,
              ).animate().fadeIn(delay: 250.ms, duration: 400.ms),

              const SizedBox(height: 40),

              // Sign up link
              Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      "Don't have an account? ",
                      style: TextStyle(
                        fontFamily: 'Syne',
                        fontSize: 13,
                        color: isDark
                            ? AppColors.darkTextSecondary
                            : AppColors.lightTextSecondary,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => context.go(AppRoutes.signup),
                      child: const Text(
                        'Sign Up',
                        style: TextStyle(
                          fontFamily: 'Syne',
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 300.ms, duration: 400.ms),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Tab switcher ──────────────────────────────────────────────────────────────
class _TabSwitcher extends StatelessWidget {
  final bool isPhone;
  final void Function(bool) onChanged;

  const _TabSwitcher({required this.isPhone, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      height: 46,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface2 : AppColors.lightSurface2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      child: Row(
        children: [
          _Tab(
            label: 'Email',
            isSelected: !isPhone,
            onTap: () => onChanged(false),
          ),
          _Tab(
            label: 'Phone',
            isSelected: isPhone,
            onTap: () => onChanged(true),
          ),
        ],
      ),
    );
  }
}

class _Tab extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _Tab(
      {required this.label, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? AppColors.darkSurface3 : AppColors.lightSurface)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    )
                  ]
                : [],
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontFamily: 'Syne',
                fontSize: 13,
                fontWeight:
                    isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected
                    ? AppColors.primary
                    : (isDark
                        ? AppColors.darkTextSecondary
                        : AppColors.lightTextSecondary),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Email form ────────────────────────────────────────────────────────────────
class _EmailForm extends StatelessWidget {
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final bool isLoading;
  final VoidCallback onLogin;

  const _EmailForm({
    super.key,
    required this.emailCtrl,
    required this.passCtrl,
    required this.isLoading,
    required this.onLogin,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        JdcTextField(
          label: 'Email address',
          hint: 'you@example.com',
          controller: emailCtrl,
          keyboardType: TextInputType.emailAddress,
          prefixIcon: const Icon(Icons.mail_outline_rounded, size: 20),
          validator: (v) {
            if (v == null || v.isEmpty) return 'Email is required';
            if (!RegExp(r'^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(v)) {
              return 'Enter a valid email';
            }
            return null;
          },
        ),
        const SizedBox(height: 16),
        JdcTextField(
          label: 'Password',
          controller: passCtrl,
          isPassword: true,
          textInputAction: TextInputAction.done,
          prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
          validator: (v) {
            if (v == null || v.isEmpty) return 'Password is required';
            if (v.length < 6) return 'Min. 6 characters';
            return null;
          },
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () {},
            child: const Text('Forgot password?'),
          ),
        ),
        const SizedBox(height: 8),
        JdcPrimaryButton(
          label: 'Sign In',
          onPressed: onLogin,
          isLoading: isLoading,
        ),
      ],
    );
  }
}

// ── Phone form ────────────────────────────────────────────────────────────────
class _PhoneForm extends StatelessWidget {
  final TextEditingController controller;
  final bool isLoading;
  final VoidCallback onSend;

  const _PhoneForm({
    super.key,
    required this.controller,
    required this.isLoading,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Phone field with +91 prefix
        TextFormField(
          controller: controller,
          keyboardType: TextInputType.phone,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(10),
          ],
          style: TextStyle(
            fontFamily: 'Syne',
            fontSize: 15,
            fontWeight: FontWeight.w500,
            color: isDark
                ? AppColors.darkTextPrimary
                : AppColors.lightTextPrimary,
          ),
          decoration: InputDecoration(
            labelText: 'Mobile number',
            prefixIcon: Container(
              margin: const EdgeInsets.only(left: 12, right: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '🇮🇳 +91',
                    style: TextStyle(
                      fontFamily: 'Syne',
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDark
                          ? AppColors.darkTextSecondary
                          : AppColors.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    width: 1,
                    height: 20,
                    color: isDark
                        ? AppColors.darkBorderBright
                        : AppColors.lightBorderBright,
                  ),
                  const SizedBox(width: 8),
                ],
              ),
            ),
            prefixIconConstraints: const BoxConstraints(minWidth: 0),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'We\'ll send a 6-digit OTP to verify your number.',
          style: TextStyle(
            fontFamily: 'Syne',
            fontSize: 12,
            color: isDark
                ? AppColors.darkTextTertiary
                : AppColors.lightTextTertiary,
          ),
        ),
        const SizedBox(height: 24),
        JdcPrimaryButton(
          label: 'Send OTP',
          onPressed: onSend,
          isLoading: isLoading,
          icon: Icons.sms_rounded,
        ),
      ],
    );
  }
}

// ── Google icon ───────────────────────────────────────────────────────────────
class _GoogleIcon extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const Text('G',
        style: TextStyle(
          fontFamily: 'Syne',
          fontSize: 18,
          fontWeight: FontWeight.w800,
          color: Color(0xFF4285F4),
        ));
  }
}
