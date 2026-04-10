import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../router/app_router.dart';
import '../../../theme/app_colors.dart';
import '../widgets/auth_field.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<_OnboardingPageData> _pages = [
    _OnboardingPageData(
      title: 'Crash Detection\nReimagined.',
      description: 'Your JDC device detects high-g impacts in real-time, instantly notifying your emergency contacts and nearby medical units.',
      icon: Iconsax.shield_tick5,
      gradient: AppColors.primaryGradient,
    ),
    _OnboardingPageData(
      title: 'Real-time GPS\nTracking.',
      description: 'Pinpoint accuracy guarantees that ambulances and first responders know exactly where to locate you when seconds matter most.',
      icon: Iconsax.map_15,
      gradient: AppColors.accentGradient,
    ),
    _OnboardingPageData(
      title: 'Automated SOS\nProtocols.',
      description: 'Stay focused on the road. We handle the rest. Hands-free emergency dispatches to local hospitals upon severe collisions.',
      icon: Iconsax.health5,
      gradient: AppColors.sosGradient,
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('hasSeenOnboarding', true);
    if (mounted) context.go(AppRoutes.login);
  }

  void _nextPage() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      _completeOnboarding();
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
      body: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) => setState(() => _currentPage = index),
            itemCount: _pages.length,
            itemBuilder: (context, index) {
              final page = _pages[index];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Icon Container
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        gradient: page.gradient,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: page.gradient.colors.first.withValues(alpha: 0.3),
                            blurRadius: 30,
                            offset: const Offset(0, 10),
                          )
                        ],
                      ),
                      child: Icon(page.icon, size: 48, color: Colors.white),
                    )
                        .animate(target: _currentPage == index ? 1 : 0)
                        .scale(duration: 400.ms, curve: Curves.easeOutBack)
                        .fadeIn(duration: 500.ms),
                    
                    const SizedBox(height: 48),

                    // Title
                    Text(
                      page.title,
                      style: TextStyle(
                        fontFamily: 'Syne',
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        color: textP,
                        height: 1.1,
                        letterSpacing: -0.5,
                      ),
                    )
                        .animate(target: _currentPage == index ? 1 : 0)
                        .slideX(begin: 0.1, end: 0, duration: 400.ms)
                        .fadeIn(),

                    const SizedBox(height: 24),

                    // Description
                    Text(
                      page.description,
                      style: TextStyle(
                        fontFamily: 'Syne',
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: textS,
                        height: 1.4,
                      ),
                    )
                        .animate(target: _currentPage == index ? 1 : 0)
                        .slideX(begin: 0.1, end: 0, duration: 400.ms, delay: 100.ms)
                        .fadeIn(delay: 100.ms),
                    
                    const SizedBox(height: 60),
                  ],
                ),
              );
            },
          ),

          // Bottom Navigation Area
          Positioned(
            bottom: 48,
            left: 32,
            right: 32,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Dot Indicators
                    Row(
                      children: List.generate(
                        _pages.length,
                        (index) => AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.only(right: 8),
                          height: 8,
                          width: _currentPage == index ? 24 : 8,
                          decoration: BoxDecoration(
                            color: _currentPage == index
                                ? AppColors.primary
                                : (isDark ? AppColors.darkBorderBright : AppColors.lightBorderBright),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                    ),
                    
                    // Skip or Next Button
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      child: _currentPage == _pages.length - 1
                          ? const SizedBox(width: 80) // Empty space for layout balance
                          : TextButton(
                              onPressed: _completeOnboarding,
                              child: Text(
                                'Skip',
                                style: TextStyle(
                                  color: textS,
                                  fontFamily: 'Syne',
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                    )
                  ],
                ),
                
                const SizedBox(height: 32),
                
                // Get Started / Next Button
                JdcPrimaryButton(
                  label: _currentPage == _pages.length - 1 ? 'Get Started' : 'Next',
                  icon: _currentPage == _pages.length - 1 ? Iconsax.arrow_right_1 : null,
                  onPressed: _nextPage,
                ).animate().fadeIn(duration: 500.ms, delay: 300.ms),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OnboardingPageData {
  final String title;
  final String description;
  final IconData icon;
  final LinearGradient gradient;

  _OnboardingPageData({
    required this.title,
    required this.description,
    required this.icon,
    required this.gradient,
  });
}
