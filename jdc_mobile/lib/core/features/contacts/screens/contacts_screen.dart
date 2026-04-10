import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';
import '../../../theme/app_colors.dart';
import '../../../supabase/supabase_client.dart';
import '../../../router/app_router.dart';
import '../../auth/widgets/auth_field.dart';

// ── Contacts provider ─────────────────────────────────────────────────────────
final contactsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final uid = supabase.auth.currentUser?.id;
  if (uid == null) return [];
  final res = await supabase
      .from('emergency_contacts')
      .select()
      .eq('user_id', uid)
      .order('priority');
  return (res as List).cast<Map<String, dynamic>>();
});

// ── Contacts Screen ───────────────────────────────────────────────────────────
class ContactsScreen extends ConsumerWidget {
  const ContactsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final contactsAsync = ref.watch(contactsProvider);

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async => ref.invalidate(contactsProvider),
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
                          Text('Emergency\nContacts',
                              style: TextStyle(
                                fontFamily: 'Syne',
                                fontSize: 26,
                                fontWeight: FontWeight.w800,
                                color: textP,
                                letterSpacing: -0.5,
                                height: 1.1,
                              )).animate().fadeIn(duration: 400.ms),
                          const SizedBox(height: 4),
                          Text('Notified instantly on crash detection',
                              style: TextStyle(
                                fontFamily: 'Syne',
                                fontSize: 13,
                                color: textS,
                              )).animate().fadeIn(delay: 100.ms),
                        ],
                      ),
                      FloatingActionButton.small(
                        onPressed: () async {
                          await context.push(AppRoutes.addContact);
                          ref.invalidate(contactsProvider);
                        },
                        backgroundColor: AppColors.primary,
                        child: const Icon(Iconsax.add, color: Colors.white),
                      ).animate().scale(delay: 200.ms, duration: 300.ms),
                    ],
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 24)),

              contactsAsync.when(
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
                data: (contacts) {
                  if (contacts.isEmpty) {
                    return SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(40),
                        child: Column(
                          children: [
                            Icon(Iconsax.people,
                                size: 60,
                                color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary),
                            const SizedBox(height: 16),
                            Text('No contacts yet',
                                style: TextStyle(
                                  fontFamily: 'Syne',
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: textP,
                                )),
                            const SizedBox(height: 8),
                            Text('Add at least one emergency contact so your\ndevice can notify them during a crash.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontFamily: 'Syne',
                                  fontSize: 13,
                                  color: textS,
                                )),
                            const SizedBox(height: 24),
                            SizedBox(
                              width: 180,
                              child: JdcPrimaryButton(
                                label: 'Add Contact',
                                icon: Iconsax.add,
                                onPressed: () async {
                                  await context.push(AppRoutes.addContact);
                                  ref.invalidate(contactsProvider);
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
                        final contact = contacts[i];
                        return Padding(
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                          child: _ContactCard(
                            contact: contact,
                            isDark: isDark,
                            onDelete: () async {
                              final confirmed = await showDialog<bool>(
                                context: context,
                                builder: (d) => AlertDialog(
                                  backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                                  title: Text('Remove Contact',
                                      style: TextStyle(fontFamily: 'Syne', fontWeight: FontWeight.w700, color: textP)),
                                  content: Text('Remove ${contact['full_name']} from emergency contacts?',
                                      style: TextStyle(fontFamily: 'Syne', color: textS)),
                                  actions: [
                                    TextButton(
                                        onPressed: () => Navigator.pop(d, false),
                                        child: const Text('Cancel', style: TextStyle(fontFamily: 'Syne'))),
                                    TextButton(
                                        onPressed: () => Navigator.pop(d, true),
                                        child: const Text('Remove',
                                            style: TextStyle(fontFamily: 'Syne', color: AppColors.primary))),
                                  ],
                                ),
                              );
                              if (confirmed == true) {
                                await supabase
                                    .from('emergency_contacts')
                                    .delete()
                                    .eq('id', contact['id']);
                                ref.invalidate(contactsProvider);
                              }
                            },
                          ),
                        ).animate().fadeIn(
                            delay: Duration(milliseconds: 150 + i * 60),
                            duration: 300.ms);
                      },
                      childCount: contacts.length,
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

// ── Contact Card ───────────────────────────────────────────────────────────────
class _ContactCard extends StatelessWidget {
  final Map<String, dynamic> contact;
  final bool isDark;
  final VoidCallback onDelete;

  const _ContactCard({
    required this.contact,
    required this.isDark,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final priority = contact['priority'] as int? ?? 1;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: priority == 1
              ? AppColors.primary.withValues(alpha: 0.25)
              : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: priority == 1
                  ? AppColors.primaryGradient
                  : LinearGradient(colors: [
                      isDark ? AppColors.darkSurface3 : AppColors.lightSurface3,
                      isDark ? AppColors.darkSurface3 : AppColors.lightSurface3,
                    ]),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                (contact['full_name'] as String)[0].toUpperCase(),
                style: TextStyle(
                  fontFamily: 'Syne',
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: priority == 1 ? Colors.white : textS,
                ),
              ),
            ),
          ),

          const SizedBox(width: 14),

          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      contact['full_name'] ?? '',
                      style: TextStyle(
                        fontFamily: 'Syne',
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: textP,
                      ),
                    ),
                    if (priority == 1) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primaryContainer,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          'Primary',
                          style: TextStyle(
                            fontFamily: 'Syne',
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  contact['phone'] ?? '',
                  style: TextStyle(
                    fontFamily: 'Syne',
                    fontSize: 13,
                    color: textS,
                  ),
                ),
                if (contact['relation'] != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    contact['relation'],
                    style: TextStyle(
                      fontFamily: 'Syne',
                      fontSize: 11,
                      color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Delete button
          IconButton(
            onPressed: onDelete,
            icon: const Icon(Iconsax.trash, size: 18),
            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
          ),
        ],
      ),
    );
  }
}
