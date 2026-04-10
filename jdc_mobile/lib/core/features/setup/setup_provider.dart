import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../supabase/supabase_client.dart';

// ── Setup step state ──────────────────────────────────────────────────────────
enum SetupStatus { idle, loading, success, error }

class SetupState {
  // Step 1 — Profile
  final String fullName;
  final String bloodGroup;
  final String gender;
  final XFile? profilePhoto;

  // Step 2 — Emergency Contact
  final String contactName;
  final String contactPhone;
  final String contactRelation;

  // Step 3 — Device
  final String deviceId;
  final String vehiclePlate;

  final SetupStatus status;
  final String? errorMessage;

  const SetupState({
    this.fullName = '',
    this.bloodGroup = '',
    this.gender = '',
    this.profilePhoto,
    this.contactName = '',
    this.contactPhone = '',
    this.contactRelation = '',
    this.deviceId = '',
    this.vehiclePlate = '',
    this.status = SetupStatus.idle,
    this.errorMessage,
  });

  SetupState copyWith({
    String? fullName,
    String? bloodGroup,
    String? gender,
    XFile? profilePhoto,
    String? contactName,
    String? contactPhone,
    String? contactRelation,
    String? deviceId,
    String? vehiclePlate,
    SetupStatus? status,
    String? errorMessage,
  }) =>
      SetupState(
        fullName: fullName ?? this.fullName,
        bloodGroup: bloodGroup ?? this.bloodGroup,
        gender: gender ?? this.gender,
        profilePhoto: profilePhoto ?? this.profilePhoto,
        contactName: contactName ?? this.contactName,
        contactPhone: contactPhone ?? this.contactPhone,
        contactRelation: contactRelation ?? this.contactRelation,
        deviceId: deviceId ?? this.deviceId,
        vehiclePlate: vehiclePlate ?? this.vehiclePlate,
        status: status ?? this.status,
        errorMessage: errorMessage,
      );
}

// ── Setup notifier ────────────────────────────────────────────────────────────
class SetupNotifier extends StateNotifier<SetupState> {
  SetupNotifier() : super(const SetupState());

  void updateProfile({
    String? fullName,
    String? bloodGroup,
    String? gender,
    XFile? profilePhoto,
  }) =>
      state = state.copyWith(
        fullName: fullName,
        bloodGroup: bloodGroup,
        gender: gender,
        profilePhoto: profilePhoto,
      );

  void updateContact({
    String? name,
    String? phone,
    String? relation,
  }) =>
      state = state.copyWith(
        contactName: name,
        contactPhone: phone,
        contactRelation: relation,
      );

  void updateDevice({String? deviceId, String? vehiclePlate}) =>
      state = state.copyWith(deviceId: deviceId, vehiclePlate: vehiclePlate);

  Future<bool> submitAll() async {
    state = state.copyWith(status: SetupStatus.loading);
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('Not authenticated');

      // 1. Update user profile
      await supabase.from(SupabaseTables.users).upsert({
        'id': userId,
        'full_name': state.fullName.isNotEmpty ? state.fullName : null,
        'blood_group': state.bloodGroup.isNotEmpty ? state.bloodGroup : null,
        'gender': state.gender.isNotEmpty ? state.gender.toLowerCase() : null,
      }, onConflict: 'id');

      // 2. Add emergency contact (if provided)
      if (state.contactName.isNotEmpty && state.contactPhone.isNotEmpty) {
        await supabase.from(SupabaseTables.emergencyContacts).insert({
          'user_id': userId,
          'full_name': state.contactName,
          'phone': state.contactPhone,
          'relation': state.contactRelation.isNotEmpty
              ? state.contactRelation
              : 'Other',
          'priority': 1,
        });
      }

      // 3. Pair device (if provided)
      if (state.deviceId.isNotEmpty) {
        await supabase.from(SupabaseTables.devices).upsert({
          'user_id': userId,
          'device_id': state.deviceId,
          'device_name': 'JDC Device',
          'vehicle_plate': state.vehiclePlate.isNotEmpty
              ? state.vehiclePlate.toUpperCase()
              : null,
          'is_active': true,
        }, onConflict: 'device_id');
      }

      state = state.copyWith(status: SetupStatus.success);
      return true;
    } catch (e) {
      state = state.copyWith(
          status: SetupStatus.error,
          errorMessage: e.toString());
      return false;
    }
  }

  void clearError() => state = state.copyWith(status: SetupStatus.idle);
}

final setupProvider =
    StateNotifierProvider<SetupNotifier, SetupState>((ref) => SetupNotifier());
