
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
import AsyncStorage from "@react-native-async-storage/async-storage";

const GOOGLE_MAPS_API_KEY_STORAGE = "@photoforge_google_maps_api_key";

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
  const [mapProvider, setMapProvider] = useState<"osm" | "google">("osm");
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Load saved Google Maps API key
  useEffect(() => {
    loadGoogleMapsApiKey();
  }, []);

  const loadGoogleMapsApiKey = async () => {
    try {
      const savedKey = await AsyncStorage.getItem(GOOGLE_MAPS_API_KEY_STORAGE);
      if (savedKey) {
        setGoogleMapsApiKey(savedKey);
        console.log("✅ Loaded saved Google Maps API key");
      }
    } catch (error) {
      console.error("❌ Error loading Google Maps API key:", error);
    }
  };

  const saveGoogleMapsApiKey = async (key: string) => {
    try {
      await AsyncStorage.setItem(GOOGLE_MAPS_API_KEY_STORAGE, key);
      console.log("✅ Saved Google Maps API key");
    } catch (error) {
      console.error("❌ Error saving Google Maps API key:", error);
    }
  };

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
        "Please draw a polygon on the map to define the flight area. Use the drawing tools on the map to create a boundary.",
        [
          { text: "Use Demo Area", onPress: () => generatePlan() },
          { text: "Cancel", style: "cancel" },
        ]
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
      console.log("🛫 Generating flight plan with parameters:", {
        altitude: parseInt(altitude),
        overlap: parseInt(overlap),
        speed: parseInt(speed),
        gimbalAngle: parseInt(gimbalAngle),
      });

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

      console.log("📊 Flight plan result:", result);

      if (result.success) {
        // Handle different response formats from backend
        const planData = result.data?.data || result.data;
        
        if (planData && planData.waypoints && planData.metadata) {
          setFlightPlanData(planData);
          
          // Send waypoints to map for visualization
          if (webViewRef.current && planData.waypoints) {
            const waypointsJS = JSON.stringify(planData.waypoints);
            webViewRef.current.injectJavaScript(`
              if (typeof displayWaypoints === 'function') {
                displayWaypoints(${waypointsJS});
              }
              true;
            `);
          }

          Alert.alert(
            "Success",
            `Flight plan generated!\n\n${planData.metadata.total_waypoints} waypoints\n${planData.metadata.estimated_photos} photos\n${planData.metadata.estimated_flight_time_minutes.toFixed(1)} minutes\n${planData.metadata.total_distance_km.toFixed(2)} km`,
            [
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
      console.error("❌ Upload flight plan error:", error);
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

    // For now, just show the data in an alert
    // In a real implementation, this would download the file
    let exportData = "";
    
    if (format === "json") {
      exportData = JSON.stringify(flightPlanData, null, 2);
    } else if (format === "kml") {
      exportData = "KML export coming soon...";
    } else if (format === "csv") {
      exportData = "CSV export coming soon...";
    }

    Alert.alert(
      `Export ${format.toUpperCase()}`,
      `Export functionality will be available in a future update.\n\nFor now, here's a preview:\n${exportData.substring(0, 200)}...`,
      [{ text: "OK" }]
    );
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === "area_drawn") {
        setDrawnArea(data.area);
        console.log("✅ Area drawn:", data.area);
        Alert.alert("Area Defined", "Flight area has been defined. You can now generate the flight plan.");
      } else if (data.type === "map_ready") {
        console.log("✅ Map is ready");
      }
    } catch (error) {
      console.error("❌ Error parsing WebView message:", error);
    }
  };

  const handleSaveApiKey = () => {
    if (googleMapsApiKey.trim()) {
      saveGoogleMapsApiKey(googleMapsApiKey.trim());
      setShowApiKeyInput(false);
      Alert.alert(
        "API Key Saved",
        "Your Google Maps API key has been saved. You can now use Google Maps.",
        [
          {
            text: "Use Google Maps",
            onPress: () => setMapProvider("google"),
          },
          { text: "OK" },
        ]
      );
    } else {
      Alert.alert("Error", "Please enter a valid API key");
    }
  };

  // Generate map HTML based on provider
  const getMapHTML = () => {
    if (mapProvider === "google" && googleMapsApiKey) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100vh; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=drawing"></script>
          <script>
            let map;
            let drawingManager;
            let currentPolygon = null;
            let waypointMarkers = [];

            function initMap() {
              map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: 37.7749, lng: -122.4194 },
                zoom: 13,
                mapTypeId: 'satellite'
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
                coordinates.push(coordinates[0]); // Close the polygon

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

            function displayWaypoints(waypoints) {
              // Clear existing markers
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

              // Draw flight path
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
    }

    // Default to OpenStreetMap with Leaflet
    return `
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
          <Text style={styles.subtitle}>
            Automated drone flight path generation for mapping missions
          </Text>
        </View>

        {/* Map Provider Selection */}
        <View style={styles.mapProviderSection}>
          <Text style={styles.sectionTitle}>Map Provider</Text>
          <View style={styles.mapProviderButtons}>
            <Pressable
              style={[
                styles.mapProviderButton,
                mapProvider === "osm" && styles.mapProviderButtonActive,
              ]}
              onPress={() => setMapProvider("osm")}
            >
              <IconSymbol
                ios_icon_name="map"
                android_material_icon_name="map"
                size={20}
                color={mapProvider === "osm" ? colors.surface : colors.textPrimary}
              />
              <Text
                style={[
                  styles.mapProviderButtonText,
                  mapProvider === "osm" && styles.mapProviderButtonTextActive,
                ]}
              >
                OpenStreetMap
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.mapProviderButton,
                mapProvider === "google" && styles.mapProviderButtonActive,
              ]}
              onPress={() => {
                if (!googleMapsApiKey) {
                  Alert.alert(
                    "Google Maps API Key Required",
                    "You need to configure your Google Maps API key to use Google Maps. Would you like to add it now?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Add API Key", onPress: () => setShowApiKeyInput(true) },
                    ]
                  );
                } else {
                  setMapProvider("google");
                }
              }}
            >
              <IconSymbol
                ios_icon_name="map.fill"
                android_material_icon_name="satellite"
                size={20}
                color={mapProvider === "google" ? colors.surface : colors.textPrimary}
              />
              <Text
                style={[
                  styles.mapProviderButtonText,
                  mapProvider === "google" && styles.mapProviderButtonTextActive,
                ]}
              >
                Google Maps
              </Text>
            </Pressable>
          </View>
          
          {/* Google Maps API Key Configuration */}
          {showApiKeyInput && (
            <View style={styles.apiKeySection}>
              <Text style={styles.apiKeyTitle}>Configure Google Maps API Key</Text>
              <Text style={styles.apiKeyHelp}>
                To use Google Maps, you need to provide your own API key. Get one from the Google Cloud Console:
              </Text>
              <Text style={styles.apiKeySteps}>
                1. Go to console.cloud.google.com{'\n'}
                2. Create a project or select existing{'\n'}
                3. Enable Maps JavaScript API{'\n'}
                4. Create credentials (API Key){'\n'}
                5. Paste your API key below
              </Text>
              <TextInput
                style={styles.apiKeyInput}
                value={googleMapsApiKey}
                onChangeText={setGoogleMapsApiKey}
                placeholder="AIzaSy..."
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                multiline={false}
              />
              <View style={styles.apiKeyButtons}>
                <Button
                  onPress={() => setShowApiKeyInput(false)}
                  variant="outline"
                  style={styles.apiKeyButton}
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleSaveApiKey}
                  style={styles.apiKeyButton}
                >
                  Save API Key
                </Button>
              </View>
            </View>
          )}

          {googleMapsApiKey && !showApiKeyInput && (
            <View style={styles.apiKeyStatus}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.apiKeyStatusText}>
                Google Maps API key configured
              </Text>
              <Pressable onPress={() => setShowApiKeyInput(true)}>
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={20}
                  color={colors.primary}
                />
              </Pressable>
            </View>
          )}
        </View>

        {/* Interactive Map */}
        <View style={styles.mapContainer}>
          <Text style={styles.sectionTitle}>Define Flight Area</Text>
          <View style={styles.mapWrapper}>
            <WebView
              ref={webViewRef}
              source={{ html: getMapHTML() }}
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
            📍 Use the drawing tools to define your flight area. Tap the polygon or rectangle icon on the map.
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
                placeholder="120"
                placeholderTextColor={colors.textSecondary}
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
                placeholder="70"
                placeholderTextColor={colors.textSecondary}
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
                placeholder="10"
                placeholderTextColor={colors.textSecondary}
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
                placeholder="-90"
                placeholderTextColor={colors.textSecondary}
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
                  placeholder="13.2"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.label}>Sensor Height (mm)</Text>
                <TextInput
                  style={styles.input}
                  value={sensorHeight}
                  onChangeText={setSensorHeight}
                  keyboardType="numeric"
                  placeholder="8.8"
                  placeholderTextColor={colors.textSecondary}
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
                  placeholder="8.8"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.label}>Image Width (px)</Text>
                <TextInput
                  style={styles.input}
                  value={imageWidth}
                  onChangeText={setImageWidth}
                  keyboardType="numeric"
                  placeholder="5472"
                  placeholderTextColor={colors.textSecondary}
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
                placeholder="3648"
                placeholderTextColor={colors.textSecondary}
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
            <React.Fragment>
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
            </React.Fragment>
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
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  mapProviderSection: {
    marginBottom: 24,
  },
  mapProviderButtons: {
    flexDirection: "row",
    gap: 12,
  },
  mapProviderButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface + "CC",
    borderWidth: 2,
    borderColor: colors.accentBorder,
  },
  mapProviderButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mapProviderButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  mapProviderButtonTextActive: {
    color: colors.surface,
  },
  apiKeySection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  apiKeyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  apiKeyHelp: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  apiKeySteps: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  apiKeyInput: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.backgroundLight,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  apiKeyButtons: {
    flexDirection: "row",
    gap: 12,
  },
  apiKeyButton: {
    flex: 1,
  },
  apiKeyStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.success + "20",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.success,
  },
  apiKeyStatusText: {
    flex: 1,
    fontSize: 13,
    color: colors.success,
    fontWeight: "600",
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
