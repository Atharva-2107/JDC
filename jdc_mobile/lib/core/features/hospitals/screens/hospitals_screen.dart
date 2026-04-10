import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../theme/app_colors.dart';
import '../../../supabase/supabase_client.dart';

class HospitalsScreen extends StatefulWidget {
  const HospitalsScreen({super.key});

  @override
  State<HospitalsScreen> createState() => _HospitalsScreenState();
}

class _HospitalsScreenState extends State<HospitalsScreen> {
  List<Map<String, dynamic>> _hospitals = [];
  Position? _currentPosition;
  bool _isLoading = true;
  String _filter = 'All';

  @override
  void initState() {
    super.initState();
    _fetchHospitals();
  }

  Future<void> _fetchHospitals() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() => _isLoading = false);
      return;
    }
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        setState(() => _isLoading = false);
        return;
      }
    }
    if (permission == LocationPermission.deniedForever) {
      setState(() => _isLoading = false);
      return;
    }

    try {
      Position? position;
      try {
        position = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.medium,
            timeLimit: const Duration(seconds: 8));
      } catch (e) {
        debugPrint('getCurrentPosition failed: $e, falling back to last known.');
        position = await Geolocator.getLastKnownPosition();
      }

      if (position == null) {
        debugPrint('Location unavailable. Using fallback location (Mumbai).');
        position = Position(
          longitude: 72.8777,
          latitude: 19.0760,
          timestamp: DateTime.now(),
          accuracy: 100.0,
          altitude: 0.0,
          altitudeAccuracy: 0.0,
          heading: 0.0,
          headingAccuracy: 0.0,
          speed: 0.0,
          speedAccuracy: 0.0,
        );
      }

      if (mounted) setState(() => _currentPosition = position);

      final query = '''
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:4000,${position.latitude},${position.longitude});
          node["amenity"="clinic"](around:4000,${position.latitude},${position.longitude});
        );
        out center;
      ''';
      
      final url = Uri.parse('https://overpass-api.de/api/interpreter');
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: {'data': query},
      ).timeout(const Duration(seconds: 40));
      
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final elements = json['elements'] as List;
        final List<Map<String, dynamic>> fetched = [];
        
        for (var e in elements) {
          final tags = e['tags'] ?? {};
          final lat = e['lat'] ?? e['center']?['lat'];
          final lon = e['lon'] ?? e['center']?['lon'];
          if (lat == null || lon == null) continue;
          
          final double latitude = (lat is num) ? lat.toDouble() : double.parse(lat.toString());
          final double longitude = (lon is num) ? lon.toDouble() : double.parse(lon.toString());

          final distanceInMeters = Geolocator.distanceBetween(
              position.latitude, position.longitude, latitude, longitude);
          
          String name = tags['name'] ?? '';
          if (name.isEmpty) name = 'Local Medical Center';

          fetched.add({
            'name': name,
            'short': name.length > 20 ? '${name.substring(0, 18)}..' : name,
            'distance': '${(distanceInMeters / 1000).toStringAsFixed(1)} km',
            'raw_distance': distanceInMeters,
            'address': tags['addr:full'] ?? tags['addr:street'] ?? 'Nearby',
            'phone': tags['phone'] ?? '112',
            'type': tags['amenity'] == 'hospital' ? 'Government' : 'Private',
            'lat': lat,
            'lon': lon,
          });
        }
        
        fetched.sort((a, b) => (a['raw_distance'] as double)
            .compareTo(b['raw_distance'] as double));

        // ── Deduplicate: keep only the closest entry per unique hospital name ──
        final seen = <String>{};
        final deduped = <Map<String, dynamic>>[];
        for (final h in fetched) {
          final String originalName = h['name'] as String;
          if (originalName == 'Local Medical Center') {
            deduped.add(h);
            continue;
          }
          final key = originalName.trim().toLowerCase();
          if (seen.add(key)) {
            deduped.add(h);
          }
        }
            
        if (deduped.isEmpty && _currentPosition != null) {
          deduped.add({
             'name': 'Demonstration Hospital',
             'short': 'Demo Hospital',
             'distance': '1.0 km',
             'raw_distance': 1000.0,
             'address': 'Dadar, Mumbai (Demo)',
             'phone': '112',
             'type': 'Government',
             'lat': _currentPosition!.latitude,
             'lon': _currentPosition!.longitude,
          });
        }
            
        if (mounted) {
          setState(() {
             _hospitals = deduped;
             _isLoading = false;
          });
        }
      } else {
        debugPrint('Overpass API Error: ${response.statusCode} - ${response.body}');
        if (mounted) {
          setState(() {
            _isLoading = false;
            if (_currentPosition != null) {
                _hospitals = [{
                  'name': 'API Rate Limited (Offline Mode)',
                  'short': 'Demo Hospital',
                  'distance': '1.0 km',
                  'raw_distance': 1000.0,
                  'address': 'Dadar, Mumbai (Demo)',
                  'phone': '112',
                  'type': 'Government',
                  'lat': _currentPosition!.latitude,
                  'lon': _currentPosition!.longitude,
                }];
            }
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching OSM hospitals: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          if (_hospitals.isEmpty && _currentPosition != null) {
              _hospitals = [{
                'name': 'Demonstration Hospital (Offline)',
                'short': 'Demo Hospital',
                'distance': '1.0 km',
                'raw_distance': 1000.0,
                'address': 'System Fallback Address',
                'phone': '112',
                'type': 'Private',
                'lat': _currentPosition!.latitude,
                'lon': _currentPosition!.longitude,
              }];
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e.toString().contains('Location unavailable') 
                  ? e.toString().replaceFirst('Exception: ', '') 
                  : 'Unable to fetch hospitals. Displaying offline data.',
              style: const TextStyle(fontFamily: 'Syne', color: Colors.white),
            ),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  List<Map<String, dynamic>> get _filtered {
    if (_filter == 'All') return _hospitals;
    return _hospitals.where((h) => h['type'] == _filter).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkBackground : AppColors.lightBackground;
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // ── Header ─────────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Nearby Hospitals',
                        style: TextStyle(
                          fontFamily: 'Syne',
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: textP,
                          letterSpacing: -0.5,
                        )).animate().fadeIn(duration: 400.ms),
                    const SizedBox(height: 4),
                    Text('Emergency facilities near your location',
                        style: TextStyle(
                          fontFamily: 'Syne',
                          fontSize: 13,
                          color: textS,
                        )).animate().fadeIn(delay: 100.ms),
                  ],
                ),
              ),
            ),

            // ── Emergency CTA ───────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: GestureDetector(
                  onTap: () async {
                    final uri = Uri.parse('tel:112');
                    if (await canLaunchUrl(uri)) await launchUrl(uri);
                  },
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.3),
                          blurRadius: 16, offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Iconsax.call, color: Colors.white, size: 22),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Call Emergency Services',
                                  style: TextStyle(
                                    fontFamily: 'Syne',
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  )),
                              SizedBox(height: 2),
                              Text('Dial 112 · Ambulance · Fire · Police',
                                  style: TextStyle(
                                    fontFamily: 'Syne',
                                    fontSize: 12,
                                    color: Colors.white70,
                                  )),
                            ],
                          ),
                        ),
                        const Icon(Iconsax.arrow_right_3, color: Colors.white70, size: 18),
                      ],
                    ),
                  ),
                ).animate().slideY(begin: 0.08, end: 0, delay: 150.ms, duration: 400.ms).fadeIn(delay: 150.ms),
              ),
            ),

            // ── Filter chips ────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Row(
                  children: ['All', 'Government', 'Private']
                      .map((f) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: GestureDetector(
                              onTap: () => setState(() => _filter = f),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                decoration: BoxDecoration(
                                  color: _filter == f
                                      ? AppColors.primaryContainer
                                      : (isDark ? AppColors.darkSurface2 : AppColors.lightSurface),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: _filter == f
                                        ? AppColors.primary
                                        : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                                  ),
                                ),
                                child: Text(f,
                                    style: TextStyle(
                                      fontFamily: 'Syne',
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: _filter == f
                                          ? AppColors.primary
                                          : textS,
                                    )),
                              ),
                            ),
                          ))
                      .toList(),
                ).animate().fadeIn(delay: 200.ms),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 16)),

            // ── Map Overview ──────────────────────────────────────────────
            if (_currentPosition != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: Container(
                    height: 220,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: FlutterMap(
                      options: MapOptions(
                        initialCenter: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                        initialZoom: 13.5,
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.example.jdc_mobile',
                        ),
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                              width: 40,
                              height: 40,
                              child: const Icon(Iconsax.location5, color: AppColors.primary, size: 30),
                            ),
                            ..._filtered.map((h) => Marker(
                                  point: LatLng((h['lat'] as num).toDouble(), (h['lon'] as num).toDouble()),
                                  width: 30,
                                  height: 30,
                                  child: Icon(Iconsax.hospital5,
                                      color: h['type'] == 'Private' ? AppColors.accent : AppColors.success,
                                      size: 22),
                                )),
                          ],
                        ),
                      ],
                    ),
                  ),
                ).animate().fadeIn(delay: 200.ms),
              ),

            // ── Hospital list ───────────────────────────────────────────────
            if (_isLoading)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            else if (_filtered.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Text('No hospitals found nearby.',
                      style: TextStyle(
                        fontFamily: 'Syne',
                        fontSize: 14,
                        color: textS,
                      )),
                ),
              )
            else
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (ctx, i) {
                    final h = _filtered[i];
                    return Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                      child: _HospitalCard(hospital: h, isDark: isDark),
                    ).animate().fadeIn(
                        delay: Duration(milliseconds: 250 + i * 60),
                        duration: 300.ms);
                  },
                  childCount: _filtered.length,
                ),
              ),

            const SliverToBoxAdapter(child: SizedBox(height: 32)),
          ],
        ),
      ),
    );
  }
}

// ── Hospital Card ─────────────────────────────────────────────────────────────
class _HospitalCard extends StatelessWidget {
  final Map<String, dynamic> hospital;
  final bool isDark;
  const _HospitalCard({required this.hospital, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final textP = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
    final textS = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final isPrivate = hospital['type'] == 'Private';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: (isPrivate ? AppColors.accent : AppColors.success).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Iconsax.hospital,
                    color: isPrivate ? AppColors.accent : AppColors.success,
                    size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(hospital['short'],
                        style: TextStyle(
                          fontFamily: 'Syne',
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: textP,
                        )),
                    const SizedBox(height: 2),
                    Text(hospital['address'],
                        style: TextStyle(fontFamily: 'Syne', fontSize: 12, color: textS)),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(hospital['distance'],
                      style: const TextStyle(
                        fontFamily: 'Syne',
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      )),
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: (isPrivate ? AppColors.accent : AppColors.success).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(hospital['type'],
                        style: TextStyle(
                          fontFamily: 'Syne',
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: isPrivate ? AppColors.accent : AppColors.success,
                        )),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 14),
          const Divider(height: 1),
          const SizedBox(height: 14),

          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () async {
                    final uri = Uri.parse('tel:${hospital['phone']}');
                    if (await canLaunchUrl(uri)) await launchUrl(uri);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Iconsax.call, size: 14, color: AppColors.primary),
                        SizedBox(width: 6),
                        Text('Call',
                            style: TextStyle(
                              fontFamily: 'Syne',
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            )),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: GestureDetector(
                  onTap: () async {
                    final name = Uri.encodeComponent(hospital['name']);
                    final uri = Uri.parse('https://www.google.com/maps/search/$name');
                    if (await canLaunchUrl(uri)) await launchUrl(uri);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.accentContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Iconsax.map_1, size: 14, color: AppColors.accent),
                        SizedBox(width: 6),
                        Text('Directions',
                            style: TextStyle(
                              fontFamily: 'Syne',
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.accent,
                            )),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
