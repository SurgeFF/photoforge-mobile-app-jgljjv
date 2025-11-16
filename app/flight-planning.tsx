
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

const GOOGLE_MAPS_API_KEY_STORAGE = "@google_maps_api_key";

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

  // Mission Configuration
  const [missionName, setMissionName] = useState("DA3S Mapping");
  const [droneModel, setDroneModel] = useState("phantom4pro");
  const [targetAGL, setTargetAGL] = useState("164");
  const [globalSpeed, setGlobalSpeed] = useState("5");
  const [gimbalPitch, setGimbalPitch] = useState("-90");
  const [finishAction, setFinishAction] = useState("gohome");
  const [exitOnRCLost, setExitOnRCLost] = useState(true);

  // Terrain Following
  const [enableTerrainFollowing, setEnableTerrainFollowing] = useState(false);
  const [minClearance, setMinClearance] = useState("50");
  const [obstacleSafetyMargin, setObstacleSafetyMargin] = useState("30");

  // Grid Pattern Generator
  const [gridSpacing, setGridSpacing] = useState("medium");
  const [photoOverlap, setPhotoOverlap] = useState("70");
  const [flightLineSpacing, setFlightLineSpacing] = useState("auto");

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
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [mapReady, setMapReady] = useState(false);

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
      } else {
        console.log("⚠️ No Google Maps API key found. Map will use OpenStreetMap.");
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
    matrice30: {
      name: "DJI Matrice 30",
      sensor_width: 17.3,
      sensor_height: 13.0,
      focal_length: 24,
      image_width: 8000,
      image_height: 6000,
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
    setDroneModel(droneKey);
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
    if (!targetAGL || !photoOverlap) {
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
      console.log("🛫 Generating flight plan with parameters:", {
        altitude: parseInt(targetAGL),
        overlap: parseInt(photoOverlap),
        speed: parseInt(globalSpeed),
        gimbalAngle: parseInt(gimbalPitch),
        terrainFollowing: enableTerrainFollowing,
        gridSpacing: gridSpacing,
      });

      // Calculate spacing based on grid setting
      let spacingMultiplier = 1.0;
      if (gridSpacing === "fine") spacingMultiplier = 0.7;
      else if (gridSpacing === "coarse") spacingMultiplier = 1.5;

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
        altitude: parseInt(targetAGL) * 0.3048, // Convert feet to meters
        overlap: parseInt(photoOverlap),
        drone_specs: {
          sensor_width: parseFloat(sensorWidth),
          sensor_height: parseFloat(sensorHeight),
          focal_length: parseFloat(focalLength),
          image_width: parseInt(imageWidth),
          image_height: parseInt(imageHeight),
          max_speed: parseInt(globalSpeed),
          gimbal_angle: parseInt(gimbalPitch),
          spacing_multiplier: spacingMultiplier,
          terrain_following: enableTerrainFollowing,
          min_clearance: enableTerrainFollowing ? parseFloat(minClearance) * 0.3048 : undefined,
          obstacle_margin: enableTerrainFollowing ? parseFloat(obstacleSafetyMargin) * 0.3048 : undefined,
        },
      });

      console.log("📊 Flight plan result:", result);

      if (result.success) {
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
        mission_name: missionName,
        altitude: parseInt(targetAGL) * 0.3048,
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

  const handleExport = (format: "json" | "kml" | "csv") => {
    if (!flightPlanData) {
      Alert.alert("Error", "No flight plan to export");
      return;
    }

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
        setMapReady(true);
      }
    } catch (error) {
      console.error("❌ Error parsing WebView message:", error);
    }
  };

  // Generate map HTML
  const getMapHTML = () => {
    if (googleMapsApiKey) {
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
          {!googleMapsApiKey && (
            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.infoText}>
                Using OpenStreetMap. Add Google Maps API key in settings for satellite imagery.
              </Text>
            </View>
          )}
        </View>

        {/* Mission Configuration */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Mission Configuration</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mission Name</Text>
            <TextInput
              style={styles.input}
              value={missionName}
              onChangeText={setMissionName}
              placeholder="DA3S Mapping 2"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

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
                    size={24}
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
              <Text style={styles.label}>Target AGL (ft) *</Text>
              <Text style={styles.valueLabel}>{targetAGL} ft</Text>
            </View>
            <TextInput
              style={styles.input}
              value={targetAGL}
              onChangeText={setTargetAGL}
              keyboardType="numeric"
              placeholder="164"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.helpText}>
              Above Ground Level altitude in feet
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Global Speed (m/s)</Text>
              <Text style={styles.valueLabel}>{globalSpeed} m/s</Text>
            </View>
            <TextInput
              style={styles.input}
              value={globalSpeed}
              onChangeText={setGlobalSpeed}
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.helpText}>
              Flight speed in meters per second
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Gimbal Pitch (degrees)</Text>
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
            <Text style={styles.helpText}>
              -90° = straight down (nadir), -45° = oblique
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Finish Action</Text>
            <View style={styles.radioGroup}>
              <Pressable
                style={[styles.radioButton, finishAction === "gohome" && styles.radioButtonSelected]}
                onPress={() => setFinishAction("gohome")}
              >
                <View style={[styles.radioCircle, finishAction === "gohome" && styles.radioCircleSelected]}>
                  {finishAction === "gohome" && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>Go Home</Text>
              </Pressable>
              <Pressable
                style={[styles.radioButton, finishAction === "hover" && styles.radioButtonSelected]}
                onPress={() => setFinishAction("hover")}
              >
                <View style={[styles.radioCircle, finishAction === "hover" && styles.radioCircleSelected]}>
                  {finishAction === "hover" && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>Hover</Text>
              </Pressable>
              <Pressable
                style={[styles.radioButton, finishAction === "land" && styles.radioButtonSelected]}
                onPress={() => setFinishAction("land")}
              >
                <View style={[styles.radioCircle, finishAction === "land" && styles.radioCircleSelected]}>
                  {finishAction === "land" && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>Land</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>Exit Mission on RC Signal Lost</Text>
              <Text style={styles.helpText}>Return to home if signal lost</Text>
            </View>
            <Switch
              value={exitOnRCLost}
              onValueChange={setExitOnRCLost}
              trackColor={{ false: colors.textSecondary, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        {/* Terrain Following */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Terrain Following</Text>
          <Text style={styles.sectionSubtitle}>
            Configure before generating grid. Uses Google Elevation API to adjust waypoint altitudes based on ground elevation.
          </Text>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Min Clearance (ft)</Text>
              <Text style={styles.valueLabel}>{minClearance} ft</Text>
            </View>
            <TextInput
              style={styles.input}
              value={minClearance}
              onChangeText={setMinClearance}
              keyboardType="numeric"
              placeholder="50"
              placeholderTextColor={colors.textSecondary}
              editable={enableTerrainFollowing}
            />
            <Text style={styles.helpText}>
              Minimum clearance above terrain
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Obstacle Safety Margin (ft)</Text>
              <Text style={styles.valueLabel}>{obstacleSafetyMargin} ft</Text>
            </View>
            <TextInput
              style={styles.input}
              value={obstacleSafetyMargin}
              onChangeText={setObstacleSafetyMargin}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={colors.textSecondary}
              editable={enableTerrainFollowing}
            />
            <Text style={styles.helpText}>
              Additional safety buffer for obstacles
            </Text>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>Enable Terrain Following</Text>
              <Text style={styles.helpText}>Maintain consistent AGL throughout mission</Text>
            </View>
            <Switch
              value={enableTerrainFollowing}
              onValueChange={setEnableTerrainFollowing}
              trackColor={{ false: colors.textSecondary, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        {/* Grid Pattern Generator */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Grid Pattern Generator</Text>
          <Text style={styles.sectionSubtitle}>
            Draw a survey area first by clicking "Draw Area" above, then click on the map to define your polygon
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Flight Path Segmentation</Text>
            <View style={styles.radioGroup}>
              <Pressable
                style={[styles.radioButton, gridSpacing === "fine" && styles.radioButtonSelected]}
                onPress={() => setGridSpacing("fine")}
              >
                <View style={[styles.radioCircle, gridSpacing === "fine" && styles.radioCircleSelected]}>
                  {gridSpacing === "fine" && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>Fine</Text>
              </Pressable>
              <Pressable
                style={[styles.radioButton, gridSpacing === "medium" && styles.radioButtonSelected]}
                onPress={() => setGridSpacing("medium")}
              >
                <View style={[styles.radioCircle, gridSpacing === "medium" && styles.radioCircleSelected]}>
                  {gridSpacing === "medium" && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>Medium</Text>
              </Pressable>
              <Pressable
                style={[styles.radioButton, gridSpacing === "coarse" && styles.radioButtonSelected]}
                onPress={() => setGridSpacing("coarse")}
              >
                <View style={[styles.radioCircle, gridSpacing === "coarse" && styles.radioCircleSelected]}>
                  {gridSpacing === "coarse" && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>Coarse</Text>
              </Pressable>
            </View>
            <Text style={styles.helpText}>
              Fine = More waypoints, better coverage. Coarse = Fewer waypoints, faster mission
            </Text>
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
              placeholder="70"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.helpText}>
              Higher overlap = better 3D reconstruction but more photos
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
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.primary + "20",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.primary,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
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
  radioGroup: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
    flex: 1,
    minWidth: 100,
  },
  radioButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "20",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface + "CC",
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
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
