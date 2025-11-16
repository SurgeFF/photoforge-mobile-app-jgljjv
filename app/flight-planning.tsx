
import React, { useState, useRef, useEffect } from "react";
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
  Switch,
  Modal,
} from "react-native";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import { generateFlightPlanMobile, djiUploadFlightPlan, getAccessKey } from "@/utils/apiClient";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Securely load Google Maps API Key from environment variables
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface FlightPlanStatistics {
  total_waypoints: number;
  total_photos: number;
  flight_lines: number;
  total_distance_meters: number;
  estimated_flight_time_minutes: number;
  estimated_battery_usage_percent: number;
  area_coverage_sq_km: string;
  gsd_cm_per_pixel: string;
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
  const scrollViewRef = useRef<ScrollView>(null);

  // Mission Configuration
  const [missionName, setMissionName] = useState("DA3S Mapping");
  const [droneModel, setDroneModel] = useState("phantom4pro");
  const [targetAGL, setTargetAGL] = useState("120");
  const [globalSpeed, setGlobalSpeed] = useState("10");
  const [gimbalPitch, setGimbalPitch] = useState("-90");
  
  // Finish Action and RC Signal Lost Settings
  const [finishAction, setFinishAction] = useState("gohome");
  const [exitOnRCLost, setExitOnRCLost] = useState(true);
  const [showFinishActionModal, setShowFinishActionModal] = useState(false);

  // Terrain Following
  const [enableTerrainFollowing, setEnableTerrainFollowing] = useState(false);
  const [minClearance, setMinClearance] = useState("30");
  const [obstacleSafetyMargin, setObstacleSafetyMargin] = useState("10");

  // Grid Pattern Generator - Segmentation (0-100)
  const [segmentation, setSegmentation] = useState(50);
  const [photoOverlap, setPhotoOverlap] = useState("75");

  // Camera specs (DJI Phantom 4 Pro defaults)
  const [sensorWidth, setSensorWidth] = useState("13.2");
  const [imageWidth, setImageWidth] = useState("5472");
  const [cameraFOV, setCameraFOV] = useState("84");

  // Address search
  const [searchAddress, setSearchAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [flightPlanData, setFlightPlanData] = useState<{
    waypoints: Waypoint[];
    statistics: FlightPlanStatistics;
  } | null>(null);
  const [drawnArea, setDrawnArea] = useState<Array<{ lat: number; lng: number }> | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [isMapTouched, setIsMapTouched] = useState(false);

  // File type selection modal
  const [showFileTypeModal, setShowFileTypeModal] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState<"json" | "kml" | "csv">("json");

  // Finish action options
  const finishActionOptions = [
    { value: "gohome", label: "Go Home", icon: { ios: "house.fill", android: "home" } },
    { value: "hover", label: "Hover", icon: { ios: "pause.circle.fill", android: "pause_circle" } },
    { value: "land", label: "Land", icon: { ios: "arrow.down.circle.fill", android: "flight_land" } },
    { value: "continue", label: "Continue", icon: { ios: "arrow.right.circle.fill", android: "arrow_forward" } },
  ];

  // Drone presets
  const dronePresets: Record<string, any> = {
    phantom4pro: {
      name: "DJI Phantom 4 Pro",
      sensor_width: 13.2,
      image_width: 5472,
      camera_fov: 84,
    },
    mavic2pro: {
      name: "DJI Mavic 2 Pro",
      sensor_width: 13.2,
      image_width: 5472,
      camera_fov: 77,
    },
    mavic3: {
      name: "DJI Mavic 3",
      sensor_width: 17.3,
      image_width: 5280,
      camera_fov: 84,
    },
    matrice30: {
      name: "DJI Matrice 30",
      sensor_width: 17.3,
      image_width: 8000,
      camera_fov: 84,
    },
    air2s: {
      name: "DJI Air 2S",
      sensor_width: 13.2,
      image_width: 5472,
      camera_fov: 88,
    },
    mini3pro: {
      name: "DJI Mini 3 Pro",
      sensor_width: 9.7,
      image_width: 4032,
      camera_fov: 82.1,
    },
  };

  // Check if API key is configured
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn("⚠️ Google Maps API key is not configured. Please add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file");
    }
  }, []);

  const handleDroneChange = (droneKey: string) => {
    setDroneModel(droneKey);
    const preset = dronePresets[droneKey];
    if (preset) {
      setSensorWidth(preset.sensor_width.toString());
      setImageWidth(preset.image_width.toString());
      setCameraFOV(preset.camera_fov.toString());
    }
  };

  const handleAddressSearch = async () => {
    if (!searchAddress.trim()) {
      Alert.alert("Error", "Please enter an address");
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      Alert.alert("Configuration Error", "Google Maps API key is not configured. Please contact the app administrator.");
      return;
    }

    setIsSearching(true);
    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchAddress)}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        console.log("📍 Address found:", location);

        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            if (typeof panToLocation === 'function') {
              panToLocation(${location.lat}, ${location.lng});
            }
            true;
          `);
        }

        Alert.alert("Success", `Found: ${data.results[0].formatted_address}`);
      } else {
        Alert.alert("Not Found", "Could not find the address. Please try a different search.");
      }
    } catch (error) {
      console.error("❌ Address search error:", error);
      Alert.alert("Error", "Failed to search address");
    } finally {
      setIsSearching(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!targetAGL || !photoOverlap) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!drawnArea || drawnArea.length < 3) {
      Alert.alert(
        "No Area Defined",
        "Please draw a polygon on the map to define the flight area. Use the drawing tools on the map to create a boundary with at least 3 points.",
        [
          { text: "Use Demo Area", onPress: () => generatePlan() },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    const altitudeNum = parseInt(targetAGL);
    if (altitudeNum > 400) {
      Alert.alert(
        "Altitude Warning",
        "Altitude exceeds 400ft (120m). This may violate local regulations in many countries. Continue anyway?",
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
      console.log("🛫 Generating flight plan with new mobile endpoint...");

      if (!projectId) {
        Alert.alert("Error", "No project selected. Please select a project first.");
        router.back();
        return;
      }

      const areaCoordinates = drawnArea || [
        { lat: 37.7749, lng: -122.4194 },
        { lat: 37.7750, lng: -122.4194 },
        { lat: 37.7750, lng: -122.4180 },
        { lat: 37.7749, lng: -122.4180 },
      ];

      console.log("📊 Flight plan parameters:");
      console.log("   - Project ID:", projectId);
      console.log("   - Area coordinates:", areaCoordinates.length, "points");
      console.log("   - Altitude:", targetAGL, "meters");
      console.log("   - Overlap:", photoOverlap, "%");
      console.log("   - Speed:", globalSpeed, "m/s");
      console.log("   - Gimbal pitch:", gimbalPitch, "°");
      console.log("   - Finish action:", finishAction);
      console.log("   - Exit on RC lost:", exitOnRCLost);
      console.log("   - Terrain following:", enableTerrainFollowing);
      console.log("   - Min clearance:", minClearance, "m");
      console.log("   - Obstacle safety margin:", obstacleSafetyMargin, "m");
      console.log("   - Segmentation:", segmentation);

      // Prepare settings object matching backend API
      const settings = {
        altitude: parseInt(targetAGL),
        overlap: parseInt(photoOverlap),
        speed: parseInt(globalSpeed),
        gimbal_pitch: parseInt(gimbalPitch),
        camera_fov: parseFloat(cameraFOV),
        image_width: parseInt(imageWidth),
        sensor_width: parseFloat(sensorWidth),
        terrain_following: enableTerrainFollowing,
        min_clearance: enableTerrainFollowing ? parseInt(minClearance) : undefined,
        obstacle_safety_margin: enableTerrainFollowing ? parseInt(obstacleSafetyMargin) : undefined,
        segmentation: segmentation,
        finish_action: finishAction,
        exit_on_rc_lost: exitOnRCLost,
      };

      console.log("⚙️ Settings:", settings);

      const result = await generateFlightPlanMobile(
        projectId,
        areaCoordinates,
        settings
      );

      console.log("📊 Flight plan result:", result);

      if (result.success && result.data) {
        const planData = result.data;
        
        if (planData.waypoints && planData.statistics) {
          setFlightPlanData({
            waypoints: planData.waypoints,
            statistics: planData.statistics,
          });
          
          if (webViewRef.current && planData.waypoints) {
            const waypointsJS = JSON.stringify(planData.waypoints);
            webViewRef.current.injectJavaScript(`
              if (typeof displayWaypoints === 'function') {
                displayWaypoints(${waypointsJS});
              }
              true;
            `);
          }

          const stats = planData.statistics;
          Alert.alert(
            "Success",
            `Flight plan generated!\n\n` +
            `• ${stats.total_waypoints} waypoints\n` +
            `• ${stats.total_photos} photos\n` +
            `• ${stats.flight_lines} flight lines\n` +
            `• ${stats.estimated_flight_time_minutes.toFixed(1)} minutes\n` +
            `• ${(stats.total_distance_meters / 1000).toFixed(2)} km\n` +
            `• ${stats.estimated_battery_usage_percent}% battery\n` +
            `• ${stats.area_coverage_sq_km} km² coverage\n` +
            `• ${stats.gsd_cm_per_pixel} cm/px GSD`,
            [
              {
                text: "Download",
                onPress: () => setShowFileTypeModal(true),
              },
              {
                text: "Upload to Drone",
                onPress: () => handleUploadToDrone(),
              },
              { text: "OK" },
            ]
          );
        } else {
          console.error("❌ Invalid flight plan data structure:", planData);
          Alert.alert("Error", "Invalid flight plan data received from server");
        }
      } else {
        Alert.alert("Error", result.error || "Failed to generate flight plan");
      }
    } catch (error) {
      console.error("❌ Generate flight plan error:", error);
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
        mission_name: missionName,
        altitude: parseInt(targetAGL),
        speed: parseInt(globalSpeed),
        gimbal_angle: parseInt(gimbalPitch),
        finish_action: finishAction,
        exit_on_rc_lost: exitOnRCLost,
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
      console.error("❌ Upload flight plan error:", error);
      Alert.alert("Error", "Failed to upload flight plan to drone");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (fileType: "json" | "kml" | "csv") => {
    if (!flightPlanData) {
      Alert.alert("Error", "No flight plan to download");
      return;
    }

    setSelectedFileType(fileType);
    setShowFileTypeModal(false);

    console.log(`📥 Downloading flight plan as ${fileType.toUpperCase()}`);
    
    Alert.alert(
      `Download ${fileType.toUpperCase()}`,
      `Flight plan will be downloaded as ${fileType.toUpperCase()} format.\n\nThis feature will be fully implemented in a future update with actual file download functionality.`,
      [{ text: "OK" }]
    );
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === "area_drawn") {
        const coordinates = data.area.coordinates[0];
        const areaCoords = coordinates.slice(0, -1).map((coord: [number, number]) => ({
          lat: coord[1],
          lng: coord[0],
        }));
        
        setDrawnArea(areaCoords);
        console.log("✅ Area drawn:", areaCoords.length, "points");
        Alert.alert("Area Defined", `Flight area defined with ${areaCoords.length} points. You can now generate the flight plan.`);
      } else if (data.type === "map_ready") {
        console.log("✅ Map is ready");
        setMapReady(true);
      }
    } catch (error) {
      console.error("❌ Error parsing WebView message:", error);
    }
  };

  const getMapHTML = () => {
    if (!GOOGLE_MAPS_API_KEY) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              background: #f5f5f5;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .error {
              text-align: center;
              color: #d32f2f;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h3>⚠️ Configuration Error</h3>
            <p>Google Maps API key is not configured.</p>
            <p>Please add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file.</p>
          </div>
        </body>
        </html>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; overflow: hidden; }
          #map { width: 100%; height: 100%; touch-action: none; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=drawing"></script>
        <script>
          let map;
          let drawingManager;
          let currentPolygon = null;
          let waypointMarkers = [];

          function initMap() {
            map = new google.maps.Map(document.getElementById('map'), {
              center: { lat: 37.7749, lng: -122.4194 },
              zoom: 13,
              mapTypeId: 'satellite',
              gestureHandling: 'greedy',
              disableDefaultUI: false,
              zoomControl: true,
              mapTypeControl: false,
              scaleControl: true,
              streetViewControl: false,
              rotateControl: false,
              fullscreenControl: false
            });

            drawingManager = new google.maps.drawing.DrawingManager({
              drawingMode: google.maps.drawing.OverlayType.POLYGON,
              drawingControl: true,
              drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: ['polygon', 'rectangle']
              },
              polygonOptions: {
                fillColor: '#4CAF50',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#4CAF50',
                editable: true
              }
            });

            drawingManager.setMap(map);

            google.maps.event.addListener(drawingManager, 'overlaycomplete', function(event) {
              if (currentPolygon) {
                currentPolygon.setMap(null);
              }
              currentPolygon = event.overlay;

              const path = currentPolygon.getPath();
              const coordinates = [];
              for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                coordinates.push([point.lng(), point.lat()]);
              }
              coordinates.push(coordinates[0]);

              const area = {
                type: 'Polygon',
                coordinates: [coordinates]
              };

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'area_drawn',
                area: area
              }));

              drawingManager.setDrawingMode(null);
            });

            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'map_ready'
            }));
          }

          function panToLocation(lat, lng) {
            if (map) {
              map.panTo({ lat: lat, lng: lng });
              map.setZoom(15);
            }
          }

          function displayWaypoints(waypoints) {
            waypointMarkers.forEach(marker => marker.setMap(null));
            waypointMarkers = [];

            if (!waypoints || waypoints.length === 0) return;

            const bounds = new google.maps.LatLngBounds();

            waypoints.forEach((wp, index) => {
              const marker = new google.maps.Marker({
                position: { lat: wp.lat, lng: wp.lon },
                map: map,
                label: {
                  text: (index + 1).toString(),
                  color: 'white',
                  fontWeight: 'bold'
                },
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 12,
                  fillColor: '#4CAF50',
                  fillOpacity: 1,
                  strokeColor: 'white',
                  strokeWeight: 2
                }
              });

              marker.addListener('click', function() {
                const infoWindow = new google.maps.InfoWindow({
                  content: 'Waypoint ' + (index + 1) + '<br>Action: ' + wp.action + '<br>Alt: ' + wp.altitude + 'm'
                });
                infoWindow.open(map, marker);
              });

              waypointMarkers.push(marker);
              bounds.extend({ lat: wp.lat, lng: wp.lon });
            });

            if (waypoints.length > 1) {
              const path = waypoints.map(wp => ({ lat: wp.lat, lng: wp.lon }));
              const flightPath = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: '#2196F3',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                map: map
              });
              waypointMarkers.push(flightPath);
            }

            map.fitBounds(bounds);
          }

          initMap();
        </script>
      </body>
      </html>
    `;
  };

  const getFinishActionLabel = () => {
    const option = finishActionOptions.find(opt => opt.value === finishAction);
    return option?.label || "Go Home";
  };

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

      <View style={styles.contentContainer}>
        {/* Map Section - Fixed at top, no scrolling */}
        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>Define Flight Area</Text>
          
          <View style={styles.addressSearchContainer}>
            <TextInput
              style={styles.addressInput}
              value={searchAddress}
              onChangeText={setSearchAddress}
              placeholder="Enter address to jump to location..."
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              onSubmitEditing={handleAddressSearch}
            />
            <Pressable
              style={styles.searchButton}
              onPress={handleAddressSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <IconSymbol
                  ios_icon_name="magnifyingglass"
                  android_material_icon_name="search"
                  size={20}
                  color={colors.surface}
                />
              )}
            </Pressable>
          </View>

          {Platform.OS === 'web' ? (
            <View style={styles.webNotSupported}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={48}
                color={colors.warning}
              />
              <Text style={styles.webNotSupportedText}>
                Interactive map is not available on web preview.
              </Text>
            </View>
          ) : (
            <View 
              style={styles.mapWrapper}
              onStartShouldSetResponder={() => {
                setIsMapTouched(true);
                return false;
              }}
              onResponderRelease={() => {
                setIsMapTouched(false);
              }}
            >
              <WebView
                ref={webViewRef}
                source={{ html: getMapHTML() }}
                style={styles.webView}
                onMessage={handleWebViewMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scrollEnabled={false}
                bounces={false}
                overScrollMode="never"
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {drawnArea && (
            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={16}
                color={colors.success}
              />
              <Text style={[styles.infoText, { color: colors.success, fontSize: 11 }]}>
                Area defined: {drawnArea.length} points
              </Text>
            </View>
          )}
        </View>

        {/* Scrollable Settings Section */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={!isMapTouched}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Mission Configuration</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Drone Model</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.droneSelector}>
                {Object.entries(dronePresets).map(([key, preset]) => (
                  <Pressable
                    key={key}
                    style={[
                      styles.droneCard,
                      droneModel === key && styles.droneCardSelected,
                    ]}
                    onPress={() => handleDroneChange(key)}
                  >
                    <IconSymbol
                      ios_icon_name="airplane"
                      android_material_icon_name="flight"
                      size={20}
                      color={droneModel === key ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.droneCardText,
                        droneModel === key && styles.droneCardTextSelected,
                      ]}
                    >
                      {preset.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Altitude (m)</Text>
                <Text style={styles.valueLabel}>{targetAGL} m</Text>
              </View>
              <TextInput
                style={styles.input}
                value={targetAGL}
                onChangeText={setTargetAGL}
                keyboardType="numeric"
                placeholder="120"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Speed (m/s)</Text>
                <Text style={styles.valueLabel}>{globalSpeed} m/s</Text>
              </View>
              <TextInput
                style={styles.input}
                value={globalSpeed}
                onChangeText={setGlobalSpeed}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Gimbal Pitch (°)</Text>
                <Text style={styles.valueLabel}>{gimbalPitch}°</Text>
              </View>
              <TextInput
                style={styles.input}
                value={gimbalPitch}
                onChangeText={setGimbalPitch}
                keyboardType="numeric"
                placeholder="-90"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Photo Overlap (%)</Text>
                <Text style={styles.valueLabel}>{photoOverlap}%</Text>
              </View>
              <TextInput
                style={styles.input}
                value={photoOverlap}
                onChangeText={setPhotoOverlap}
                keyboardType="numeric"
                placeholder="75"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Grid Segmentation</Text>
                <Text style={styles.valueLabel}>{segmentation}</Text>
              </View>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Coarse</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={segmentation}
                  onValueChange={setSegmentation}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.textSecondary}
                  thumbTintColor={colors.primary}
                />
                <Text style={styles.sliderLabel}>Fine</Text>
              </View>
              <Text style={styles.helpText}>
                0 = coarse grid pattern, 100 = fine grid pattern
              </Text>
            </View>

            {/* Finish Action Setting */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Finish Action</Text>
              <Pressable
                style={styles.selectButton}
                onPress={() => setShowFinishActionModal(true)}
              >
                <Text style={styles.selectButtonText}>{getFinishActionLabel()}</Text>
                <IconSymbol
                  ios_icon_name="chevron.down"
                  android_material_icon_name="expand_more"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
              <Text style={styles.helpText}>
                What the drone should do when the flight plan is completed
              </Text>
            </View>

            {/* Exit on RC Signal Lost Setting */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.label}>Exit Mission on RC Signal Lost</Text>
                <Text style={styles.helpText}>
                  Automatically exit mission if remote controller signal is lost
                </Text>
              </View>
              <Switch
                value={exitOnRCLost}
                onValueChange={setExitOnRCLost}
                trackColor={{ false: colors.textSecondary, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>

            {/* Terrain Following Section */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.label}>Terrain Following</Text>
                <Text style={styles.helpText}>Follow terrain elevation</Text>
              </View>
              <Switch
                value={enableTerrainFollowing}
                onValueChange={setEnableTerrainFollowing}
                trackColor={{ false: colors.textSecondary, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>

            {/* Terrain Following Parameters */}
            {enableTerrainFollowing && (
              <View style={styles.terrainSettingsContainer}>
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Min Clearance (m)</Text>
                    <Text style={styles.valueLabel}>{minClearance} m</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={minClearance}
                    onChangeText={setMinClearance}
                    keyboardType="numeric"
                    placeholder="30"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={styles.helpText}>
                    Minimum clearance above terrain
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Obstacle Safety Margin (m)</Text>
                    <Text style={styles.valueLabel}>{obstacleSafetyMargin} m</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={obstacleSafetyMargin}
                    onChangeText={setObstacleSafetyMargin}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={styles.helpText}>
                    Additional safety margin for obstacle avoidance
                  </Text>
                </View>
              </View>
            )}
          </View>

          {flightPlanData && (
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Flight Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <IconSymbol
                    ios_icon_name="map.fill"
                    android_material_icon_name="map"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.statValue}>
                    {flightPlanData.statistics.total_waypoints}
                  </Text>
                  <Text style={styles.statLabel}>Waypoints</Text>
                </View>
                <View style={styles.statCard}>
                  <IconSymbol
                    ios_icon_name="camera.fill"
                    android_material_icon_name="camera_alt"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.statValue}>
                    {flightPlanData.statistics.total_photos}
                  </Text>
                  <Text style={styles.statLabel}>Photos</Text>
                </View>
                <View style={styles.statCard}>
                  <IconSymbol
                    ios_icon_name="clock.fill"
                    android_material_icon_name="schedule"
                    size={20}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.statValue}>
                    {flightPlanData.statistics.estimated_flight_time_minutes.toFixed(1)}
                  </Text>
                  <Text style={styles.statLabel}>Minutes</Text>
                </View>
                <View style={styles.statCard}>
                  <IconSymbol
                    ios_icon_name="battery.75"
                    android_material_icon_name="battery_std"
                    size={20}
                    color={
                      flightPlanData.statistics.estimated_battery_usage_percent > 80
                        ? colors.error
                        : colors.success
                    }
                  />
                  <Text style={styles.statValue}>
                    {flightPlanData.statistics.estimated_battery_usage_percent}%
                  </Text>
                  <Text style={styles.statLabel}>Battery</Text>
                </View>
              </View>
            </View>
          )}

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
              <React.Fragment>
                <Button
                  onPress={() => setShowFileTypeModal(true)}
                  variant="secondary"
                  style={styles.actionButton}
                >
                  <View style={styles.buttonContent}>
                    <IconSymbol
                      ios_icon_name="arrow.down.circle.fill"
                      android_material_icon_name="download"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={[styles.buttonText, { color: colors.primary }]}>
                      Download Flight Plan
                    </Text>
                  </View>
                </Button>

                <Button
                  onPress={handleUploadToDrone}
                  loading={isUploading}
                  disabled={isUploading}
                  variant="outline"
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
              </React.Fragment>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Finish Action Selection Modal */}
      <Modal
        visible={showFinishActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFinishActionModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowFinishActionModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finish Action</Text>
            <Text style={styles.modalSubtitle}>Select what the drone should do when the flight plan is completed</Text>

            {finishActionOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.finishActionOption,
                  finishAction === option.value && styles.finishActionOptionSelected,
                ]}
                onPress={() => {
                  setFinishAction(option.value);
                  setShowFinishActionModal(false);
                }}
              >
                <IconSymbol
                  ios_icon_name={option.icon.ios}
                  android_material_icon_name={option.icon.android}
                  size={24}
                  color={finishAction === option.value ? colors.primary : colors.textSecondary}
                />
                <Text style={[
                  styles.finishActionText,
                  finishAction === option.value && styles.finishActionTextSelected,
                ]}>
                  {option.label}
                </Text>
                {finishAction === option.value && (
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </Pressable>
            ))}

            <Button
              onPress={() => setShowFinishActionModal(false)}
              variant="outline"
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>
        </Pressable>
      </Modal>

      {/* File Type Selection Modal */}
      <Modal
        visible={showFileTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFileTypeModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowFileTypeModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select File Type</Text>
            <Text style={styles.modalSubtitle}>Choose the format for your flight plan download</Text>

            <Pressable
              style={styles.fileTypeOption}
              onPress={() => handleDownload("json")}
            >
              <IconSymbol
                ios_icon_name="doc.text"
                android_material_icon_name="description"
                size={24}
                color={colors.primary}
              />
              <View style={styles.fileTypeInfo}>
                <Text style={styles.fileTypeTitle}>JSON</Text>
                <Text style={styles.fileTypeDescription}>Standard format for most applications</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>

            <Pressable
              style={styles.fileTypeOption}
              onPress={() => handleDownload("kml")}
            >
              <IconSymbol
                ios_icon_name="map"
                android_material_icon_name="map"
                size={24}
                color={colors.primary}
              />
              <View style={styles.fileTypeInfo}>
                <Text style={styles.fileTypeTitle}>KML</Text>
                <Text style={styles.fileTypeDescription}>Google Earth compatible format</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>

            <Pressable
              style={styles.fileTypeOption}
              onPress={() => handleDownload("csv")}
            >
              <IconSymbol
                ios_icon_name="tablecells"
                android_material_icon_name="table_chart"
                size={24}
                color={colors.primary}
              />
              <View style={styles.fileTypeInfo}>
                <Text style={styles.fileTypeTitle}>CSV</Text>
                <Text style={styles.fileTypeDescription}>Spreadsheet compatible format</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>

            <Button
              onPress={() => setShowFileTypeModal(false)}
              variant="outline"
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>
        </Pressable>
      </Modal>
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
  contentContainer: {
    flex: 1,
  },
  mapSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.backgroundLight,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  addressSearchContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  addressInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
    color: colors.textPrimary,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  mapWrapper: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface,
  },
  webView: {
    flex: 1,
  },
  webNotSupported: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  webNotSupportedText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: 12,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.success + "20",
    borderRadius: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  formSection: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  valueLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  input: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
    color: colors.textPrimary,
  },
  selectButton: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
  },
  selectButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  helpText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  droneSelector: {
    flexDirection: "row",
  },
  droneCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
    marginRight: 8,
    alignItems: "center",
    minWidth: 100,
  },
  droneCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "20",
  },
  droneCardText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  droneCardTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surface + "CC",
    borderWidth: 1,
    borderColor: colors.accentBorder,
    marginBottom: 12,
  },
  switchLabel: {
    flex: 1,
    marginRight: 12,
  },
  terrainSettingsContainer: {
    marginLeft: 16,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  statsSection: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: colors.surface + "CC",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  actionSection: {
    marginTop: 8,
  },
  generateButton: {
    marginBottom: 10,
  },
  actionButton: {
    marginBottom: 10,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  buttonTextWhite: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: "center",
  },
  finishActionOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    gap: 12,
  },
  finishActionOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "20",
  },
  finishActionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  finishActionTextSelected: {
    color: colors.primary,
  },
  fileTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  fileTypeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileTypeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  fileTypeDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cancelButton: {
    marginTop: 8,
  },
});
