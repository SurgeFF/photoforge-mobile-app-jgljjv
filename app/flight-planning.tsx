
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import { generateFlightPlan, djiUploadFlightPlan } from "@/utils/apiClient";
import { WebView } from "react-native-webview";

interface FlightPlanMetadata {
  total_waypoints: number;
  estimated_flight_time_minutes: number;
  estimated_photos: number;
  total_distance_km: number;
  battery_usage_percent: number;
  ground_sample_distance_cm: number;
}

interface Waypoint {
  lat: number;
  lon: number;
  altitude: number;
  action: string;
  index: number;
}

export default function FlightPlanningScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const projectId = params.projectId as string;
  const projectName = params.projectName as string;
  const webViewRef = useRef<WebView>(null);

  // Flight parameters
  const [altitude, setAltitude] = useState("120");
  const [overlap, setOverlap] = useState("70");
  const [speed, setSpeed] = useState("10");
  const [gimbalAngle, setGimbalAngle] = useState("-90");
  
  // Camera specs (DJI Phantom 4 Pro defaults)
  const [sensorWidth, setSensorWidth] = useState("13.2");
  const [sensorHeight, setSensorHeight] = useState("8.8");
  const [focalLength, setFocalLength] = useState("8.8");
  const [imageWidth, setImageWidth] = useState("5472");
  const [imageHeight, setImageHeight] = useState("3648");

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [flightPlanData, setFlightPlanData] = useState<{
    waypoints: Waypoint[];
    metadata: FlightPlanMetadata;
  } | null>(null);
  const [drawnArea, setDrawnArea] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedDrone, setSelectedDrone] = useState("phantom4pro");

  // Drone presets
  const dronePresets: Record<string, any> = {
    phantom4pro: {
      name: "DJI Phantom 4 Pro",
      sensor_width: 13.2,
      sensor_height: 8.8,
      focal_length: 8.8,
      image_width: 5472,
      image_height: 3648,
    },
    mavic2pro: {
      name: "DJI Mavic 2 Pro",
      sensor_width: 13.2,
      sensor_height: 8.8,
      focal_length: 10.26,
      image_width: 5472,
      image_height: 3648,
    },
    mavic3: {
      name: "DJI Mavic 3",
      sensor_width: 17.3,
      sensor_height: 13.0,
      focal_length: 24,
      image_width: 5280,
      image_height: 3956,
    },
    air2s: {
      name: "DJI Air 2S",
      sensor_width: 13.2,
      sensor_height: 8.8,
      focal_length: 8.8,
      image_width: 5472,
      image_height: 3648,
    },
    mini3pro: {
      name: "DJI Mini 3 Pro",
      sensor_width: 9.7,
      sensor_height: 7.3,
      focal_length: 6.72,
      image_width: 4032,
      image_height: 3024,
    },
  };

  const handleDroneChange = (droneKey: string) => {
    setSelectedDrone(droneKey);
    const preset = dronePresets[droneKey];
    if (preset) {
      setSensorWidth(preset.sensor_width.toString());
      setSensorHeight(preset.sensor_height.toString());
      setFocalLength(preset.focal_length.toString());
      setImageWidth(preset.image_width.toString());
      setImageHeight(preset.image_height.toString());
    }
  };

  const handleGeneratePlan = async () => {
    if (!altitude || !overlap) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!drawnArea) {
      Alert.alert(
        "No Area Defined",
        "Please draw a polygon on the map to define the flight area, or use manual coordinates."
      );
      return;
    }

    const altitudeNum = parseInt(altitude);
    if (altitudeNum > 120) {
      Alert.alert(
        "Altitude Warning",
        "Altitude exceeds 120m (400ft). This may violate local regulations in many countries. Continue anyway?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: () => generatePlan() },
        ]
      );
      return;
    }

    await generatePlan();
  };

  const generatePlan = async () => {
    setIsGenerating(true);

    try {
      const result = await generateFlightPlan({
        area: drawnArea || {
          type: "Polygon",
          coordinates: [
            [
              [-122.4194, 37.7749],
              [-122.4184, 37.7749],
              [-122.4184, 37.7739],
              [-122.4194, 37.7739],
              [-122.4194, 37.7749],
            ],
          ],
        },
        altitude: parseInt(altitude),
        overlap: parseInt(overlap),
        drone_specs: {
          sensor_width: parseFloat(sensorWidth),
          sensor_height: parseFloat(sensorHeight),
          focal_length: parseFloat(focalLength),
          image_width: parseInt(imageWidth),
          image_height: parseInt(imageHeight),
          max_speed: parseInt(speed),
          gimbal_angle: parseInt(gimbalAngle),
        },
      });

      if (result.success && result.data) {
        setFlightPlanData(result.data);
        
        // Send waypoints to map for visualization
        if (webViewRef.current && result.data.waypoints) {
          const waypointsJS = JSON.stringify(result.data.waypoints);
          webViewRef.current.injectJavaScript(`
            if (typeof displayWaypoints === 'function') {
              displayWaypoints(${waypointsJS});
            }
            true;
          `);
        }

        Alert.alert(
          "Success",
          `Flight plan generated!\n\n${result.data.metadata.total_waypoints} waypoints\n${result.data.metadata.estimated_photos} photos\n${result.data.metadata.estimated_flight_time_minutes.toFixed(1)} minutes\n${result.data.metadata.total_distance_km.toFixed(2)} km`,
          [
            {
              text: "Upload to Drone",
              onPress: () => handleUploadToDrone(),
            },
            { text: "OK" },
          ]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to generate flight plan");
      }
    } catch (error) {
      console.error("Generate flight plan error:", error);
      Alert.alert("Error", "Failed to generate flight plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadToDrone = async () => {
    if (!flightPlanData) {
      Alert.alert("Error", "No flight plan to upload");
      return;
    }

    setIsUploading(true);

    try {
      const result = await djiUploadFlightPlan(flightPlanData.waypoints, {
        altitude: parseInt(altitude),
        speed: parseInt(speed),
        gimbal_angle: parseInt(gimbalAngle),
      });

      if (result.success) {
        Alert.alert(
          "Success",
          "Flight plan uploaded to drone! Go to Drone Control to start the mission.",
          [
            {
              text: "Go to Drone Control",
              onPress: () => router.push("/drone-control"),
            },
            { text: "OK" },
          ]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to upload flight plan");
      }
    } catch (error) {
      console.error("Upload flight plan error:", error);
      Alert.alert("Error", "Failed to upload flight plan to drone");
    } finally {
      setIsUploading(false);
    }
  };

  const handleExport = (format: "json" | "kml" | "csv") => {
    if (!flightPlanData) {
      Alert.alert("Error", "No flight plan to export");
      return;
    }

    Alert.alert(
      "Export",
      `Export functionality for ${format.toUpperCase()} will be available in a future update.`,
      [{ text: "OK" }]
    );
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === "area_drawn") {
        setDrawnArea(data.area);
        console.log("Area drawn:", data.area);
      } else if (data.type === "map_ready") {
        console.log("Map is ready");
      }
    } catch (error) {
      console.error("Error parsing WebView message:", error);
    }
  };

  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css" />
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
        .leaflet-container { background: #1a1a2e; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script src="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js"></script>
      <script>
        var map = L.map('map').setView([37.7749, -122.4194], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        var drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        var drawControl = new L.Control.Draw({
          edit: {
            featureGroup: drawnItems
          },
          draw: {
            polygon: true,
            polyline: false,
            rectangle: true,
            circle: false,
            marker: false,
            circlemarker: false
          }
        });
        map.addControl(drawControl);

        map.on(L.Draw.Event.CREATED, function (event) {
          var layer = event.layer;
          drawnItems.clearLayers();
          drawnItems.addLayer(layer);
          
          var geoJSON = layer.toGeoJSON();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'area_drawn',
            area: geoJSON.geometry
          }));
        });

        var waypointMarkers = [];
        
        function displayWaypoints(waypoints) {
          waypointMarkers.forEach(marker => map.removeLayer(marker));
          waypointMarkers = [];
          
          if (!waypoints || waypoints.length === 0) return;
          
          var bounds = [];
          waypoints.forEach(function(wp, index) {
            var icon = L.divIcon({
              className: 'waypoint-marker',
              html: '<div style="background: #4CAF50; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white;">' + (index + 1) + '</div>',
              iconSize: [24, 24]
            });
            
            var marker = L.marker([wp.lat, wp.lon], { icon: icon }).addTo(map);
            marker.bindPopup('Waypoint ' + (index + 1) + '<br>Action: ' + wp.action + '<br>Alt: ' + wp.altitude + 'm');
            waypointMarkers.push(marker);
            bounds.push([wp.lat, wp.lon]);
          });
          
          if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
          }
          
          // Draw flight path
          if (waypoints.length > 1) {
            var latlngs = waypoints.map(wp => [wp.lat, wp.lon]);
            var polyline = L.polyline(latlngs, { color: '#2196F3', weight: 2, dashArray: '5, 10' }).addTo(map);
            waypointMarkers.push(polyline);
          }
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'map_ready'
        }));
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>
      <TopographicBackground />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Flight Planning</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.projectInfo}>
          <IconSymbol
            ios_icon_name="airplane"
            android_material_icon_name="flight"
            size={48}
            color={colors.primary}
          />
          <Text style={styles.projectName}>{projectName || "Flight Plan"}</Text>
        </View>

        {/* Interactive Map */}
        <View style={styles.mapContainer}>
          <Text style={styles.sectionTitle}>Define Flight Area</Text>
          <View style={styles.mapWrapper}>
            <WebView
              ref={webViewRef}
              source={{ html: mapHTML }}
              style={styles.webView}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading map...</Text>
                </View>
              )}
            />
          </View>
          <Text style={styles.mapHelpText}>
            Use the drawing tools to define your flight area. Tap the polygon or rectangle icon on the map.
          </Text>
        </View>

        {/* Drone Selection */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Drone Model</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.droneSelector}>
            {Object.entries(dronePresets).map(([key, preset]) => (
              <Pressable
                key={key}
                style={[
                  styles.droneCard,
                  selectedDrone === key && styles.droneCardSelected,
                ]}
                onPress={() => handleDroneChange(key)}
              >
                <IconSymbol
                  ios_icon_name="airplane"
                  android_material_icon_name="flight"
                  size={24}
                  color={selectedDrone === key ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.droneCardText,
                    selectedDrone === key && styles.droneCardTextSelected,
                  ]}
                >
                  {preset.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Flight Parameters */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Flight Parameters</Text>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Altitude (meters) *</Text>
              <Text style={styles.valueLabel}>{altitude}m</Text>
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>50m</Text>
              <TextInput
                style={styles.sliderInput}
                value={altitude}
                onChangeText={setAltitude}
                keyboardType="numeric"
              />
              <Text style={styles.sliderLabel}>150m</Text>
            </View>
            <Text style={styles.helpText}>
              Recommended: 80-120m. Max 120m in most countries.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Image Overlap (%) *</Text>
              <Text style={styles.valueLabel}>{overlap}%</Text>
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>60%</Text>
              <TextInput
                style={styles.sliderInput}
                value={overlap}
                onChangeText={setOverlap}
                keyboardType="numeric"
              />
              <Text style={styles.sliderLabel}>85%</Text>
            </View>
            <Text style={styles.helpText}>
              Higher overlap = better 3D reconstruction but more photos
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Flight Speed (m/s)</Text>
              <Text style={styles.valueLabel}>{speed} m/s</Text>
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>3</Text>
              <TextInput
                style={styles.sliderInput}
                value={speed}
                onChangeText={setSpeed}
                keyboardType="numeric"
              />
              <Text style={styles.sliderLabel}>15</Text>
            </View>
            <Text style={styles.helpText}>
              Slower = more stable imagery. Recommended: 5-10 m/s
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Gimbal Angle (degrees)</Text>
              <Text style={styles.valueLabel}>{gimbalAngle}°</Text>
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>-90°</Text>
              <TextInput
                style={styles.sliderInput}
                value={gimbalAngle}
                onChangeText={setGimbalAngle}
                keyboardType="numeric"
              />
              <Text style={styles.sliderLabel}>-45°</Text>
            </View>
            <Text style={styles.helpText}>
              -90° = straight down (nadir), -45° = oblique
            </Text>
          </View>
        </View>

        {/* Advanced Settings */}
        <Pressable
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.advancedToggleText}>Advanced Camera Settings</Text>
          <IconSymbol
            ios_icon_name={showAdvanced ? "chevron.up" : "chevron.down"}
            android_material_icon_name={showAdvanced ? "expand_less" : "expand_more"}
            size={20}
            color={colors.textPrimary}
          />
        </Pressable>

        {showAdvanced && (
          <View style={styles.formSection}>
            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.label}>Sensor Width (mm)</Text>
                <TextInput
                  style={styles.input}
                  value={sensorWidth}
                  onChangeText={setSensorWidth}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.label}>Sensor Height (mm)</Text>
                <TextInput
                  style={styles.input}
                  value={sensorHeight}
                  onChangeText={setSensorHeight}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.label}>Focal Length (mm)</Text>
                <TextInput
                  style={styles.input}
                  value={focalLength}
                  onChangeText={setFocalLength}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.label}>Image Width (px)</Text>
                <TextInput
                  style={styles.input}
                  value={imageWidth}
                  onChangeText={setImageWidth}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Image Height (px)</Text>
              <TextInput
                style={styles.input}
                value={imageHeight}
                onChangeText={setImageHeight}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Flight Statistics */}
        {flightPlanData && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Flight Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <IconSymbol
                  ios_icon_name="map.fill"
                  android_material_icon_name="map"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.statValue}>
                  {flightPlanData.metadata.total_waypoints}
                </Text>
                <Text style={styles.statLabel}>Waypoints</Text>
              </View>
              <View style={styles.statCard}>
                <IconSymbol
                  ios_icon_name="camera.fill"
                  android_material_icon_name="camera_alt"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.statValue}>
                  {flightPlanData.metadata.estimated_photos}
                </Text>
                <Text style={styles.statLabel}>Photos</Text>
              </View>
              <View style={styles.statCard}>
                <IconSymbol
                  ios_icon_name="clock.fill"
                  android_material_icon_name="schedule"
                  size={24}
                  color={colors.primaryDark}
                />
                <Text style={styles.statValue}>
                  {flightPlanData.metadata.estimated_flight_time_minutes.toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>Minutes</Text>
              </View>
              <View style={styles.statCard}>
                <IconSymbol
                  ios_icon_name="arrow.left.arrow.right"
                  android_material_icon_name="straighten"
                  size={24}
                  color={colors.primaryDark}
                />
                <Text style={styles.statValue}>
                  {flightPlanData.metadata.total_distance_km.toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>Kilometers</Text>
              </View>
              <View style={styles.statCard}>
                <IconSymbol
                  ios_icon_name="battery.75"
                  android_material_icon_name="battery_std"
                  size={24}
                  color={
                    flightPlanData.metadata.battery_usage_percent > 80
                      ? colors.error
                      : colors.success
                  }
                />
                <Text style={styles.statValue}>
                  {flightPlanData.metadata.battery_usage_percent}%
                </Text>
                <Text style={styles.statLabel}>Battery</Text>
              </View>
              <View style={styles.statCard}>
                <IconSymbol
                  ios_icon_name="ruler"
                  android_material_icon_name="straighten"
                  size={24}
                  color={colors.primaryDark}
                />
                <Text style={styles.statValue}>
                  {flightPlanData.metadata.ground_sample_distance_cm.toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>GSD (cm)</Text>
              </View>
            </View>

            {flightPlanData.metadata.battery_usage_percent > 80 && (
              <View style={styles.warningBox}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={20}
                  color={colors.error}
                />
                <Text style={styles.warningText}>
                  High battery usage! Consider reducing area or altitude.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Button
            onPress={handleGeneratePlan}
            loading={isGenerating}
            disabled={isGenerating}
            style={styles.generateButton}
          >
            <View style={styles.buttonContent}>
              <IconSymbol
                ios_icon_name="wand.and.stars"
                android_material_icon_name="auto_fix_high"
                size={20}
                color="#fff"
              />
              <Text style={styles.buttonTextWhite}>
                {isGenerating ? "Generating..." : "Generate Flight Plan"}
              </Text>
            </View>
          </Button>

          {flightPlanData && (
            <>
              <Button
                onPress={handleUploadToDrone}
                loading={isUploading}
                disabled={isUploading}
                variant="secondary"
                style={styles.actionButton}
              >
                <View style={styles.buttonContent}>
                  <IconSymbol
                    ios_icon_name="arrow.up.circle.fill"
                    android_material_icon_name="upload"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.buttonText, { color: colors.primary }]}>
                    {isUploading ? "Uploading..." : "Upload to Drone"}
                  </Text>
                </View>
              </Button>

              <View style={styles.exportRow}>
                <Pressable
                  style={styles.exportButton}
                  onPress={() => handleExport("json")}
                >
                  <IconSymbol
                    ios_icon_name="doc.text"
                    android_material_icon_name="description"
                    size={20}
                    color={colors.textPrimary}
                  />
                  <Text style={styles.exportButtonText}>JSON</Text>
                </Pressable>
                <Pressable
                  style={styles.exportButton}
                  onPress={() => handleExport("kml")}
                >
                  <IconSymbol
                    ios_icon_name="map"
                    android_material_icon_name="map"
                    size={20}
                    color={colors.textPrimary}
                  />
                  <Text style={styles.exportButtonText}>KML</Text>
                </Pressable>
                <Pressable
                  style={styles.exportButton}
                  onPress={() => handleExport("csv")}
                >
                  <IconSymbol
                    ios_icon_name="tablecells"
                    android_material_icon_name="table_chart"
                    size={20}
                    color={colors.textPrimary}
                  />
                  <Text style={styles.exportButtonText}>CSV</Text>
                </Pressable>
              </View>
            </>
          )}

          <Button
            onPress={() => router.push("/drone-control")}
            variant="outline"
            style={styles.controlButton}
          >
            <View style={styles.buttonContent}>
              <IconSymbol
                ios_icon_name="antenna.radiowaves.left.and.right"
                android_material_icon_name="settings_remote"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.buttonText, { color: colors.primary }]}>
                Go to Drone Control
              </Text>
            </View>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === "android" ? 48 : 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  projectInfo: {
    alignItems: "center",
    marginBottom: 24,
  },
  projectName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 12,
    textAlign: "center",
  },
  mapContainer: {
    marginBottom: 24,
  },
  mapWrapper: {
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  mapHelpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  droneSelector: {
    flexDirection: "row",
  },
  droneCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
    marginRight: 12,
    alignItems: "center",
    minWidth: 120,
  },
  droneCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "20",
  },
  droneCardText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  droneCardTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputGroupHalf: {
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  valueLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sliderLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sliderInput: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
    color: colors.textPrimary,
    textAlign: "center",
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
    color: colors.textPrimary,
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface + "CC",
    borderWidth: 1,
    borderColor: colors.accentBorder,
    marginBottom: 16,
  },
  advancedToggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.error + "20",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
    gap: 12,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    fontWeight: "600",
  },
  actionSection: {
    marginTop: 8,
  },
  generateButton: {
    marginBottom: 12,
  },
  actionButton: {
    marginBottom: 12,
  },
  controlButton: {
    marginTop: 8,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextWhite: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  exportRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  exportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.surface + "CC",
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
