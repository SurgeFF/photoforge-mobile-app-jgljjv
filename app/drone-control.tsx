
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import {
  djiConnect,
  djiDisconnect,
  djiStartMission,
  djiPauseMission,
  djiResumeMission,
  djiStopMission,
  djiReturnHome,
  djiManualControl,
} from "@/utils/apiClient";

interface TelemetryData {
  timestamp: string;
  battery: {
    percentage: number;
    voltage: number;
    current: number;
    temperature: number;
  };
  gps: {
    latitude: number;
    longitude: number;
    altitude: number;
    satellite_count: number;
    signal_strength: number;
  };
  flight: {
    speed_horizontal: number;
    speed_vertical: number;
    altitude_agl: number;
    distance_from_home: number;
    heading: number;
    flight_time_seconds: number;
  };
  gimbal: {
    pitch: number;
    roll: number;
    yaw: number;
  };
  status: {
    flying: boolean;
    armed: boolean;
    gps_fixed: boolean;
    vision_enabled: boolean;
    mode: string;
    error_codes: string[];
  };
  camera: {
    recording: boolean;
    sd_capacity_gb: number;
    sd_remaining_gb: number;
    photo_count: number;
  };
}

interface DroneStatus {
  connected: boolean;
  model?: string;
  firmware?: string;
  serial_number?: string;
  telemetry?: TelemetryData;
  missionActive?: boolean;
  telemetry_ws_url?: string;
}

interface Mission {
  id: string;
  name: string;
  waypoint_count: number;
  estimated_time: number;
}

type ConnectionType = "usb" | "wifi" | "cloud";

export default function DroneControlScreen() {
  const theme = useTheme();
  const [droneStatus, setDroneStatus] = useState<DroneStatus>({
    connected: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionType, setConnectionType] = useState<ConnectionType>("wifi");
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showManualControlModal, setShowManualControlModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showEmergencyStopModal, setShowEmergencyStopModal] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([
    { id: "mission_1", name: "Survey Area A", waypoint_count: 45, estimated_time: 18 },
    { id: "mission_2", name: "Inspection Route", waypoint_count: 28, estimated_time: 12 },
    { id: "mission_3", name: "Mapping Grid", waypoint_count: 156, estimated_time: 35 },
  ]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [manualCommand, setManualCommand] = useState({
    x: "0",
    y: "0",
    z: "0",
    yaw: "0",
  });
  const [safetyWarnings, setSafetyWarnings] = useState<string[]>([]);
  const [connectionLost, setConnectionLost] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const lastTelemetryUpdate = useRef<number>(Date.now());
  const connectionCheckInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup WebSocket on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
    };
  }, []);

  // Monitor connection health
  useEffect(() => {
    if (droneStatus.connected) {
      connectionCheckInterval.current = setInterval(() => {
        const timeSinceLastUpdate = Date.now() - lastTelemetryUpdate.current;
        if (timeSinceLastUpdate > 3000) {
          // No telemetry for 3 seconds
          setConnectionLost(true);
          Alert.alert(
            "Connection Lost",
            "Lost connection to drone. Drone will follow failsafe behavior (RTH or hover). Attempting to reconnect...",
            [{ text: "OK" }]
          );
        }
      }, 1000);
    } else {
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
      setConnectionLost(false);
    }

    return () => {
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
    };
  }, [droneStatus.connected]);

  // Check for safety warnings
  useEffect(() => {
    if (!droneStatus.telemetry) return;

    const warnings: string[] = [];
    const telemetry = droneStatus.telemetry;

    // Low battery warning
    if (telemetry.battery.percentage <= 20) {
      warnings.push("CRITICAL: Battery at 20% or below - Return home immediately!");
      // Auto-trigger RTH at 20%
      if (telemetry.battery.percentage === 20 && telemetry.status.flying) {
        Alert.alert(
          "Critical Battery Level",
          "Battery at 20%. Initiating automatic Return to Home.",
          [
            {
              text: "Cancel RTH",
              style: "cancel",
            },
            {
              text: "Return Home",
              onPress: handleReturnHome,
            },
          ]
        );
      }
    } else if (telemetry.battery.percentage <= 30) {
      warnings.push("WARNING: Battery below 30% - Consider returning home");
    }

    // GPS signal warning
    if (!telemetry.status.gps_fixed) {
      warnings.push("WARNING: GPS signal lost - Switching to vision positioning");
    } else if (telemetry.gps.satellite_count < 8) {
      warnings.push("WARNING: Weak GPS signal - " + telemetry.gps.satellite_count + " satellites");
    }

    // Connection warning
    if (connectionLost) {
      warnings.push("ERROR: Connection lost - Drone following failsafe behavior");
    }

    // Error codes
    if (telemetry.status.error_codes.length > 0) {
      warnings.push("ERROR: " + telemetry.status.error_codes.join(", "));
    }

    // High temperature warning
    if (telemetry.battery.temperature > 50) {
      warnings.push("WARNING: Battery temperature high (" + telemetry.battery.temperature + "°C)");
    }

    // SD card warning
    if (telemetry.camera.sd_remaining_gb < 2) {
      warnings.push("WARNING: SD card almost full - " + telemetry.camera.sd_remaining_gb + "GB remaining");
    }

    setSafetyWarnings(warnings);
  }, [droneStatus.telemetry, connectionLost]);

  // Simulate WebSocket telemetry updates
  useEffect(() => {
    if (droneStatus.connected && droneStatus.telemetry_ws_url) {
      // In a real implementation, connect to WebSocket here
      // For now, simulate periodic updates
      const interval = setInterval(() => {
        setDroneStatus((prev) => {
          if (!prev.telemetry) return prev;

          lastTelemetryUpdate.current = Date.now();
          setConnectionLost(false);

          return {
            ...prev,
            telemetry: {
              ...prev.telemetry,
              timestamp: new Date().toISOString(),
              battery: {
                ...prev.telemetry.battery,
                percentage: Math.max(0, prev.telemetry.battery.percentage - 0.05),
                temperature: prev.telemetry.battery.temperature + (Math.random() - 0.5) * 0.5,
              },
              gps: {
                ...prev.telemetry.gps,
                altitude: prev.telemetry.gps.altitude + (Math.random() - 0.5) * 0.5,
              },
              flight: {
                ...prev.telemetry.flight,
                speed_horizontal: Math.max(0, prev.telemetry.flight.speed_horizontal + (Math.random() - 0.5) * 0.2),
                altitude_agl: prev.telemetry.flight.altitude_agl + (Math.random() - 0.5) * 0.5,
                flight_time_seconds: prev.telemetry.flight.flight_time_seconds + 0.1,
              },
            },
          };
        });
      }, 100); // Update 10 times per second

      return () => clearInterval(interval);
    }
  }, [droneStatus.connected, droneStatus.telemetry_ws_url]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setShowConnectionModal(false);

    try {
      const result = await djiConnect(connectionType);
      if (result.success && result.data) {
        // Initialize telemetry data with full structure
        const initialTelemetry: TelemetryData = {
          timestamp: new Date().toISOString(),
          battery: {
            percentage: 95,
            voltage: 15.2,
            current: 0,
            temperature: 25,
          },
          gps: {
            latitude: 37.7749,
            longitude: -122.4194,
            altitude: 125.3,
            satellite_count: 18,
            signal_strength: 5,
          },
          flight: {
            speed_horizontal: 0,
            speed_vertical: 0,
            altitude_agl: 0,
            distance_from_home: 0,
            heading: 0,
            flight_time_seconds: 0,
          },
          gimbal: {
            pitch: -90,
            roll: 0,
            yaw: 0,
          },
          status: {
            flying: false,
            armed: false,
            gps_fixed: true,
            vision_enabled: true,
            mode: "p_gps",
            error_codes: [],
          },
          camera: {
            recording: false,
            sd_capacity_gb: 64,
            sd_remaining_gb: 48,
            photo_count: 0,
          },
        };

        setDroneStatus({
          connected: true,
          model: result.data.model || "DJI Mavic 3",
          firmware: result.data.firmware || "v2.0.8",
          serial_number: result.data.serial_number || "1234567890ABCDEF",
          telemetry: initialTelemetry,
          telemetry_ws_url: "ws://drone-telemetry.local:8080",
        });

        lastTelemetryUpdate.current = Date.now();
        Alert.alert("Success", `Connected to ${result.data.model || "drone"} successfully!`);
      } else {
        Alert.alert("Error", result.error || "Failed to connect to drone");
      }
    } catch (error) {
      console.error("Connect error:", error);
      Alert.alert("Error", "Failed to connect to drone");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const result = await djiDisconnect();
      if (result.success) {
        setDroneStatus({ connected: false });
        setSelectedMission(null);
        setSafetyWarnings([]);
        setConnectionLost(false);
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        Alert.alert("Success", "Disconnected from drone");
      } else {
        Alert.alert("Error", result.error || "Failed to disconnect");
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      Alert.alert("Error", "Failed to disconnect");
    }
  };

  const handleEmergencyStop = async () => {
    setShowEmergencyStopModal(true);
  };

  const executeEmergencyStop = async () => {
    setShowEmergencyStopModal(false);
    try {
      // Stop all movement immediately
      const result = await djiManualControl("emergency_stop", {});
      if (result.success) {
        if (droneStatus.telemetry) {
          setDroneStatus({
            ...droneStatus,
            missionActive: false,
            telemetry: {
              ...droneStatus.telemetry,
              flight: {
                ...droneStatus.telemetry.flight,
                speed_horizontal: 0,
                speed_vertical: 0,
              },
              status: {
                ...droneStatus.telemetry.status,
                mode: "hover",
              },
            },
          });
        }
        Alert.alert("Emergency Stop", "All drone movement halted. Drone is hovering in place.");
      } else {
        Alert.alert("Error", result.error || "Failed to execute emergency stop");
      }
    } catch (error) {
      console.error("Emergency stop error:", error);
      Alert.alert("Error", "Failed to execute emergency stop");
    }
  };

  const handleManualControl = async (command: string) => {
    try {
      let parameters = {};

      if (command === "move") {
        parameters = {
          x: parseFloat(manualCommand.x),
          y: parseFloat(manualCommand.y),
          z: parseFloat(manualCommand.z),
        };
      } else if (command === "rotate") {
        parameters = {
          yaw: parseFloat(manualCommand.yaw),
        };
      }

      const result = await djiManualControl(command, parameters);
      if (result.success) {
        Alert.alert("Success", `${command} command sent successfully`);
        setShowManualControlModal(false);

        // Update telemetry based on command
        if (command === "takeoff" && droneStatus.telemetry) {
          setDroneStatus({
            ...droneStatus,
            telemetry: {
              ...droneStatus.telemetry,
              status: {
                ...droneStatus.telemetry.status,
                armed: true,
                flying: true,
                mode: "takeoff",
              },
            },
          });
        } else if (command === "land" && droneStatus.telemetry) {
          setDroneStatus({
            ...droneStatus,
            telemetry: {
              ...droneStatus.telemetry,
              status: {
                ...droneStatus.telemetry.status,
                flying: false,
                mode: "landing",
              },
            },
          });
        }
      } else {
        Alert.alert("Error", result.error || `Failed to execute ${command}`);
      }
    } catch (error) {
      console.error("Manual control error:", error);
      Alert.alert("Error", `Failed to execute ${command}`);
    }
  };

  const handleStartMission = async () => {
    if (!selectedMission) {
      Alert.alert("Error", "Please select a mission first");
      return;
    }

    try {
      const result = await djiStartMission(selectedMission.id);
      if (result.success) {
        setDroneStatus({ ...droneStatus, missionActive: true });
        setShowMissionModal(false);
        Alert.alert(
          "Mission Started",
          `${selectedMission.name} is now executing. Estimated time: ${selectedMission.estimated_time} minutes.`
        );
      } else {
        Alert.alert("Error", result.error || "Failed to start mission");
      }
    } catch (error) {
      console.error("Start mission error:", error);
      Alert.alert("Error", "Failed to start mission");
    }
  };

  const handleReturnHome = async () => {
    Alert.alert(
      "Return Home",
      "Command the drone to return to home point?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Return Home",
          onPress: async () => {
            try {
              const result = await djiReturnHome();
              if (result.success) {
                if (droneStatus.telemetry) {
                  setDroneStatus({
                    ...droneStatus,
                    telemetry: {
                      ...droneStatus.telemetry,
                      status: {
                        ...droneStatus.telemetry.status,
                        mode: "returning_home",
                      },
                    },
                  });
                }
                Alert.alert("Success", "Drone returning home");
              } else {
                Alert.alert("Error", result.error || "Failed to return home");
              }
            } catch (error) {
              console.error("Return home error:", error);
              Alert.alert("Error", "Failed to return home");
            }
          },
        },
      ]
    );
  };

  const handlePauseMission = async () => {
    try {
      const result = await djiPauseMission();
      if (result.success) {
        setDroneStatus({ ...droneStatus, missionActive: false });
        Alert.alert("Success", "Mission paused");
      } else {
        Alert.alert("Error", result.error || "Failed to pause mission");
      }
    } catch (error) {
      console.error("Pause mission error:", error);
      Alert.alert("Error", "Failed to pause mission");
    }
  };

  const handleResumeMission = async () => {
    try {
      const result = await djiResumeMission();
      if (result.success) {
        setDroneStatus({ ...droneStatus, missionActive: true });
        Alert.alert("Success", "Mission resumed");
      } else {
        Alert.alert("Error", result.error || "Failed to resume mission");
      }
    } catch (error) {
      console.error("Resume mission error:", error);
      Alert.alert("Error", "Failed to resume mission");
    }
  };

  const handleStopMission = async () => {
    Alert.alert(
      "Stop Mission",
      "Stop the current mission? The drone will hover in place.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await djiStopMission();
              if (result.success) {
                setDroneStatus({ ...droneStatus, missionActive: false });
                setSelectedMission(null);
                Alert.alert("Success", "Mission stopped");
              } else {
                Alert.alert("Error", result.error || "Failed to stop mission");
              }
            } catch (error) {
              console.error("Stop mission error:", error);
              Alert.alert("Error", "Failed to stop mission");
            }
          },
        },
      ]
    );
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 50) return colors.success;
    if (battery > 20) return colors.warning;
    return colors.error;
  };

  const getGPSColor = (satellites: number) => {
    if (satellites >= 12) return colors.success;
    if (satellites >= 8) return colors.warning;
    return colors.error;
  };

  const formatFlightTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
        <Text style={styles.headerTitle}>Live Drone Control</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Emergency Stop Button - Always visible when connected */}
      {droneStatus.connected && (
        <View style={styles.emergencyStopContainer}>
          <Pressable
            style={styles.emergencyStopButton}
            onPress={handleEmergencyStop}
          >
            <IconSymbol
              ios_icon_name="exclamationmark.octagon.fill"
              android_material_icon_name="warning"
              size={32}
              color={colors.surface}
            />
            <Text style={styles.emergencyStopText}>EMERGENCY STOP</Text>
          </Pressable>
        </View>
      )}

      {/* Safety Warnings Banner */}
      {safetyWarnings.length > 0 && (
        <View style={styles.warningsBanner}>
          {safetyWarnings.map((warning, index) => (
            <View key={index} style={styles.warningItem}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={20}
                color={warning.includes("CRITICAL") || warning.includes("ERROR") ? colors.error : colors.warning}
              />
              <Text
                style={[
                  styles.warningText,
                  {
                    color: warning.includes("CRITICAL") || warning.includes("ERROR") ? colors.error : colors.warning,
                  },
                ]}
              >
                {warning}
              </Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Connection Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <IconSymbol
              ios_icon_name="antenna.radiowaves.left.and.right"
              android_material_icon_name="settings_remote"
              size={32}
              color={droneStatus.connected ? colors.success : colors.textSecondary}
            />
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor: droneStatus.connected
                    ? connectionLost
                      ? colors.warning
                      : colors.success
                    : colors.textSecondary,
                },
              ]}
            />
          </View>
          <Text style={styles.statusTitle}>
            {droneStatus.connected
              ? connectionLost
                ? "Connection Lost"
                : "Connected"
              : "Disconnected"}
          </Text>
          {droneStatus.model && (
            <React.Fragment>
              <Text style={styles.statusSubtitle}>{droneStatus.model}</Text>
              <Text style={styles.statusDetail}>Firmware: {droneStatus.firmware}</Text>
              <Text style={styles.statusDetail}>S/N: {droneStatus.serial_number}</Text>
            </React.Fragment>
          )}
        </View>

        {/* Real-time Telemetry */}
        {droneStatus.connected && droneStatus.telemetry && (
          <React.Fragment>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Real-time Telemetry</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>

            {/* Battery Section */}
            <View style={styles.telemetrySection}>
              <Text style={styles.subsectionTitle}>Battery</Text>
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="battery.100"
                    android_material_icon_name="battery_full"
                    size={24}
                    color={getBatteryColor(droneStatus.telemetry.battery.percentage)}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.battery.percentage.toFixed(1)}%
                  </Text>
                  <Text style={styles.telemetryLabel}>Charge</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="bolt.fill"
                    android_material_icon_name="flash_on"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.battery.voltage.toFixed(1)}V
                  </Text>
                  <Text style={styles.telemetryLabel}>Voltage</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="thermometer"
                    android_material_icon_name="thermostat"
                    size={24}
                    color={droneStatus.telemetry.battery.temperature > 50 ? colors.error : colors.success}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.battery.temperature.toFixed(1)}°C
                  </Text>
                  <Text style={styles.telemetryLabel}>Temperature</Text>
                </View>
              </View>
            </View>

            {/* GPS Section */}
            <View style={styles.telemetrySection}>
              <Text style={styles.subsectionTitle}>GPS & Position</Text>
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="location.fill"
                    android_material_icon_name="gps_fixed"
                    size={24}
                    color={getGPSColor(droneStatus.telemetry.gps.satellite_count)}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.gps.satellite_count}
                  </Text>
                  <Text style={styles.telemetryLabel}>Satellites</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="arrow.up"
                    android_material_icon_name="height"
                    size={24}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.flight.altitude_agl.toFixed(1)}m
                  </Text>
                  <Text style={styles.telemetryLabel}>Altitude AGL</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="house.fill"
                    android_material_icon_name="home"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.flight.distance_from_home.toFixed(0)}m
                  </Text>
                  <Text style={styles.telemetryLabel}>From Home</Text>
                </View>
              </View>
              <View style={styles.coordinatesCard}>
                <Text style={styles.coordinatesText}>
                  Lat: {droneStatus.telemetry.gps.latitude.toFixed(6)}°
                </Text>
                <Text style={styles.coordinatesText}>
                  Lon: {droneStatus.telemetry.gps.longitude.toFixed(6)}°
                </Text>
                <Text style={styles.coordinatesText}>
                  GPS Fixed: {droneStatus.telemetry.status.gps_fixed ? "Yes" : "No"}
                </Text>
              </View>
            </View>

            {/* Flight Data Section */}
            <View style={styles.telemetrySection}>
              <Text style={styles.subsectionTitle}>Flight Data</Text>
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="speedometer"
                    android_material_icon_name="speed"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.flight.speed_horizontal.toFixed(1)} m/s
                  </Text>
                  <Text style={styles.telemetryLabel}>H-Speed</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="arrow.up.arrow.down"
                    android_material_icon_name="swap_vert"
                    size={24}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.flight.speed_vertical.toFixed(1)} m/s
                  </Text>
                  <Text style={styles.telemetryLabel}>V-Speed</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="clock.fill"
                    android_material_icon_name="schedule"
                    size={24}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.telemetryValue}>
                    {formatFlightTime(droneStatus.telemetry.flight.flight_time_seconds)}
                  </Text>
                  <Text style={styles.telemetryLabel}>Flight Time</Text>
                </View>
              </View>
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="safari"
                    android_material_icon_name="explore"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.flight.heading.toFixed(0)}°
                  </Text>
                  <Text style={styles.telemetryLabel}>Heading</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name={
                      droneStatus.telemetry.status.flying
                        ? "airplane"
                        : "airplane.departure"
                    }
                    android_material_icon_name={
                      droneStatus.telemetry.status.flying ? "flight" : "flight_takeoff"
                    }
                    size={24}
                    color={droneStatus.telemetry.status.flying ? colors.success : colors.textSecondary}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.status.mode.toUpperCase()}
                  </Text>
                  <Text style={styles.telemetryLabel}>Mode</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name={droneStatus.telemetry.status.armed ? "checkmark.shield.fill" : "shield"}
                    android_material_icon_name={droneStatus.telemetry.status.armed ? "verified_user" : "security"}
                    size={24}
                    color={droneStatus.telemetry.status.armed ? colors.success : colors.textSecondary}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.status.armed ? "Armed" : "Disarmed"}
                  </Text>
                  <Text style={styles.telemetryLabel}>Status</Text>
                </View>
              </View>
            </View>

            {/* Gimbal Section */}
            <View style={styles.telemetrySection}>
              <Text style={styles.subsectionTitle}>Gimbal Orientation</Text>
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryCard}>
                  <Text style={styles.gimbalLabel}>Pitch</Text>
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.gimbal.pitch.toFixed(1)}°
                  </Text>
                </View>
                <View style={styles.telemetryCard}>
                  <Text style={styles.gimbalLabel}>Roll</Text>
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.gimbal.roll.toFixed(1)}°
                  </Text>
                </View>
                <View style={styles.telemetryCard}>
                  <Text style={styles.gimbalLabel}>Yaw</Text>
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.gimbal.yaw.toFixed(1)}°
                  </Text>
                </View>
              </View>
            </View>

            {/* Camera Section */}
            <View style={styles.telemetrySection}>
              <Text style={styles.subsectionTitle}>Camera & Storage</Text>
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name={droneStatus.telemetry.camera.recording ? "record.circle.fill" : "record.circle"}
                    android_material_icon_name={droneStatus.telemetry.camera.recording ? "fiber_manual_record" : "radio_button_unchecked"}
                    size={24}
                    color={droneStatus.telemetry.camera.recording ? colors.error : colors.textSecondary}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.camera.recording ? "Recording" : "Standby"}
                  </Text>
                  <Text style={styles.telemetryLabel}>Camera</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="photo.fill"
                    android_material_icon_name="photo"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.camera.photo_count}
                  </Text>
                  <Text style={styles.telemetryLabel}>Photos</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="sdcard.fill"
                    android_material_icon_name="sd_card"
                    size={24}
                    color={droneStatus.telemetry.camera.sd_remaining_gb < 2 ? colors.error : colors.success}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.camera.sd_remaining_gb}GB
                  </Text>
                  <Text style={styles.telemetryLabel}>SD Free</Text>
                </View>
              </View>
            </View>

            {/* Live Camera Feed Placeholder */}
            <View style={styles.cameraSection}>
              <Text style={styles.subsectionTitle}>Live Camera Feed</Text>
              <View style={styles.cameraPlaceholder}>
                <IconSymbol
                  ios_icon_name="video.fill"
                  android_material_icon_name="videocam"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.cameraPlaceholderText}>
                  Camera feed requires native DJI SDK integration
                </Text>
                <Text style={styles.cameraPlaceholderSubtext}>
                  Connect via DJI Mobile SDK for live video streaming
                </Text>
              </View>
            </View>
          </React.Fragment>
        )}

        {/* Control Buttons */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Controls</Text>

          {!droneStatus.connected ? (
            <Button
              onPress={() => setShowConnectionModal(true)}
              loading={isConnecting}
              disabled={isConnecting}
              style={styles.controlButton}
            >
              <View style={styles.buttonContent}>
                <IconSymbol
                  ios_icon_name="antenna.radiowaves.left.and.right"
                  android_material_icon_name="settings_remote"
                  size={24}
                  color={colors.surface}
                />
                <Text style={styles.buttonText}>
                  {isConnecting ? "Connecting..." : "Connect to Drone"}
                </Text>
              </View>
            </Button>
          ) : (
            <React.Fragment>
              {/* Mission Controls */}
              <Button
                onPress={() => setShowMissionModal(true)}
                style={styles.controlButton}
              >
                <View style={styles.buttonContent}>
                  <IconSymbol
                    ios_icon_name="map.fill"
                    android_material_icon_name="map"
                    size={24}
                    color={colors.surface}
                  />
                  <Text style={styles.buttonText}>
                    {selectedMission ? `Mission: ${selectedMission.name}` : "Select Mission"}
                  </Text>
                </View>
              </Button>

              {droneStatus.missionActive ? (
                <React.Fragment>
                  <Button
                    onPress={handlePauseMission}
                    style={styles.controlButton}
                  >
                    <View style={styles.buttonContent}>
                      <IconSymbol
                        ios_icon_name="pause.fill"
                        android_material_icon_name="pause"
                        size={24}
                        color={colors.surface}
                      />
                      <Text style={styles.buttonText}>Pause Mission</Text>
                    </View>
                  </Button>
                  <Button
                    onPress={handleStopMission}
                    variant="outline"
                    style={styles.controlButton}
                  >
                    <View style={styles.buttonContent}>
                      <IconSymbol
                        ios_icon_name="stop.fill"
                        android_material_icon_name="stop"
                        size={24}
                        color={colors.error}
                      />
                      <Text style={[styles.buttonText, { color: colors.error }]}>
                        Stop Mission
                      </Text>
                    </View>
                  </Button>
                </React.Fragment>
              ) : selectedMission ? (
                <Button
                  onPress={handleStartMission}
                  style={styles.controlButton}
                >
                  <View style={styles.buttonContent}>
                    <IconSymbol
                      ios_icon_name="play.fill"
                      android_material_icon_name="play_arrow"
                      size={24}
                      color={colors.surface}
                    />
                    <Text style={styles.buttonText}>Start Mission</Text>
                  </View>
                </Button>
              ) : null}

              {/* Manual Control */}
              <Button
                onPress={() => setShowManualControlModal(true)}
                variant="outline"
                style={styles.controlButton}
              >
                <View style={styles.buttonContent}>
                  <IconSymbol
                    ios_icon_name="gamecontroller.fill"
                    android_material_icon_name="gamepad"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={[styles.buttonText, { color: colors.primary }]}>
                    Manual Control
                  </Text>
                </View>
              </Button>

              {/* Return Home */}
              <Button
                onPress={handleReturnHome}
                variant="outline"
                style={styles.controlButton}
              >
                <View style={styles.buttonContent}>
                  <IconSymbol
                    ios_icon_name="house.fill"
                    android_material_icon_name="home"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={[styles.buttonText, { color: colors.primary }]}>
                    Return Home
                  </Text>
                </View>
              </Button>

              {/* Disconnect */}
              <Button
                onPress={handleDisconnect}
                variant="outline"
                style={styles.controlButton}
              >
                <View style={styles.buttonContent}>
                  <IconSymbol
                    ios_icon_name="xmark.circle.fill"
                    android_material_icon_name="cancel"
                    size={24}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.buttonText, { color: colors.textSecondary }]}
                  >
                    Disconnect
                  </Text>
                </View>
              </Button>
            </React.Fragment>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.infoText}>
            {droneStatus.connected
              ? "Telemetry updates 10 times per second. Always maintain visual line of sight with your drone. Use EMERGENCY STOP button to halt all movement immediately."
              : "Make sure your DJI drone is powered on and in range before connecting. Supports USB, WiFi, and Cloud connections."}
          </Text>
        </View>
      </ScrollView>

      {/* Connection Method Modal */}
      <Modal
        visible={showConnectionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConnectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Connection Method</Text>

            <Pressable
              style={[
                styles.connectionOption,
                connectionType === "usb" && styles.connectionOptionSelected,
              ]}
              onPress={() => setConnectionType("usb")}
            >
              <IconSymbol
                ios_icon_name="cable.connector"
                android_material_icon_name="usb"
                size={32}
                color={connectionType === "usb" ? colors.primary : colors.textSecondary}
              />
              <View style={styles.connectionOptionText}>
                <Text style={styles.connectionOptionTitle}>USB</Text>
                <Text style={styles.connectionOptionDescription}>
                  Connect via drone controller USB cable
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.connectionOption,
                connectionType === "wifi" && styles.connectionOptionSelected,
              ]}
              onPress={() => setConnectionType("wifi")}
            >
              <IconSymbol
                ios_icon_name="wifi"
                android_material_icon_name="wifi"
                size={32}
                color={connectionType === "wifi" ? colors.primary : colors.textSecondary}
              />
              <View style={styles.connectionOptionText}>
                <Text style={styles.connectionOptionTitle}>WiFi Direct</Text>
                <Text style={styles.connectionOptionDescription}>
                  Connect to drone&apos;s WiFi network
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.connectionOption,
                connectionType === "cloud" && styles.connectionOptionSelected,
              ]}
              onPress={() => setConnectionType("cloud")}
            >
              <IconSymbol
                ios_icon_name="cloud.fill"
                android_material_icon_name="cloud"
                size={32}
                color={connectionType === "cloud" ? colors.primary : colors.textSecondary}
              />
              <View style={styles.connectionOptionText}>
                <Text style={styles.connectionOptionTitle}>DJI Cloud API</Text>
                <Text style={styles.connectionOptionDescription}>
                  Requires FlightHub subscription
                </Text>
              </View>
            </Pressable>

            <View style={styles.modalButtons}>
              <Button
                onPress={() => setShowConnectionModal(false)}
                variant="outline"
                style={styles.modalButton}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </Button>
              <Button onPress={handleConnect} style={styles.modalButton}>
                <Text style={styles.buttonText}>Connect</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual Control Modal */}
      <Modal
        visible={showManualControlModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualControlModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manual Control</Text>

            <View style={styles.manualControlGrid}>
              <Button
                onPress={() => handleManualControl("takeoff")}
                style={styles.manualControlButton}
              >
                <View style={styles.buttonContent}>
                  <IconSymbol
                    ios_icon_name="airplane.departure"
                    android_material_icon_name="flight_takeoff"
                    size={24}
                    color={colors.surface}
                  />
                  <Text style={styles.buttonText}>Takeoff</Text>
                </View>
              </Button>

              <Button
                onPress={() => handleManualControl("land")}
                style={styles.manualControlButton}
              >
                <View style={styles.buttonContent}>
                  <IconSymbol
                    ios_icon_name="airplane.arrival"
                    android_material_icon_name="flight_land"
                    size={24}
                    color={colors.surface}
                  />
                  <Text style={styles.buttonText}>Land</Text>
                </View>
              </Button>
            </View>

            <Text style={styles.inputLabel}>Move Command (meters)</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputSubLabel}>X (Forward)</Text>
                <TextInput
                  style={styles.input}
                  value={manualCommand.x}
                  onChangeText={(text) =>
                    setManualCommand({ ...manualCommand, x: text })
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputSubLabel}>Y (Right)</Text>
                <TextInput
                  style={styles.input}
                  value={manualCommand.y}
                  onChangeText={(text) =>
                    setManualCommand({ ...manualCommand, y: text })
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputSubLabel}>Z (Up)</Text>
                <TextInput
                  style={styles.input}
                  value={manualCommand.z}
                  onChangeText={(text) =>
                    setManualCommand({ ...manualCommand, z: text })
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <Button
              onPress={() => handleManualControl("move")}
              style={styles.fullWidthButton}
            >
              <Text style={styles.buttonText}>Execute Move</Text>
            </Button>

            <Text style={styles.inputLabel}>Rotate Command (degrees)</Text>
            <TextInput
              style={styles.input}
              value={manualCommand.yaw}
              onChangeText={(text) =>
                setManualCommand({ ...manualCommand, yaw: text })
              }
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
            />

            <Button
              onPress={() => handleManualControl("rotate")}
              style={styles.fullWidthButton}
            >
              <Text style={styles.buttonText}>Execute Rotate</Text>
            </Button>

            <Button
              onPress={() => setShowManualControlModal(false)}
              variant="outline"
              style={styles.fullWidthButton}
            >
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                Close
              </Text>
            </Button>
          </View>
        </View>
      </Modal>

      {/* Mission Selection Modal */}
      <Modal
        visible={showMissionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMissionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Mission</Text>

            <ScrollView style={styles.missionList}>
              {missions.map((mission) => (
                <Pressable
                  key={mission.id}
                  style={[
                    styles.missionItem,
                    selectedMission?.id === mission.id && styles.missionItemSelected,
                  ]}
                  onPress={() => setSelectedMission(mission)}
                >
                  <View style={styles.missionItemHeader}>
                    <IconSymbol
                      ios_icon_name="map.fill"
                      android_material_icon_name="map"
                      size={24}
                      color={
                        selectedMission?.id === mission.id
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <Text style={styles.missionItemTitle}>{mission.name}</Text>
                  </View>
                  <View style={styles.missionItemDetails}>
                    <Text style={styles.missionItemDetail}>
                      {mission.waypoint_count} waypoints
                    </Text>
                    <Text style={styles.missionItemDetail}>
                      ~{mission.estimated_time} min
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                onPress={() => setShowMissionModal(false)}
                variant="outline"
                style={styles.modalButton}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </Button>
              <Button
                onPress={() => {
                  setShowMissionModal(false);
                  if (selectedMission) {
                    Alert.alert(
                      "Mission Selected",
                      `${selectedMission.name} is ready. Press "Start Mission" to begin.`
                    );
                  }
                }}
                style={styles.modalButton}
                disabled={!selectedMission}
              >
                <Text style={styles.buttonText}>Select</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Emergency Stop Confirmation Modal */}
      <Modal
        visible={showEmergencyStopModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmergencyStopModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.emergencyModalContent]}>
            <IconSymbol
              ios_icon_name="exclamationmark.octagon.fill"
              android_material_icon_name="warning"
              size={64}
              color={colors.error}
            />
            <Text style={styles.emergencyModalTitle}>EMERGENCY STOP</Text>
            <Text style={styles.emergencyModalText}>
              This will immediately halt all drone movement. The drone will hover in place.
            </Text>
            <Text style={styles.emergencyModalWarning}>
              Use only in emergency situations!
            </Text>

            <View style={styles.modalButtons}>
              <Button
                onPress={() => setShowEmergencyStopModal(false)}
                variant="outline"
                style={styles.modalButton}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </Button>
              <Button
                onPress={executeEmergencyStop}
                style={[styles.modalButton, styles.emergencyButton]}
              >
                <Text style={styles.buttonText}>STOP NOW</Text>
              </Button>
            </View>
          </View>
        </View>
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
  emergencyStopContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  emergencyStopButton: {
    backgroundColor: colors.error,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    boxShadow: "0px 4px 12px rgba(220, 38, 38, 0.3)",
  },
  emergencyStopText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.surface,
    letterSpacing: 1,
  },
  warningsBanner: {
    backgroundColor: colors.warning + "20",
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  warningItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  statusCard: {
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  statusHeader: {
    position: "relative",
    marginBottom: 16,
  },
  statusIndicator: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusDetail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.error + "20",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  liveText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.error,
  },
  telemetrySection: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  telemetryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  telemetryCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  telemetryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 8,
  },
  telemetryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  gimbalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  coordinatesCard: {
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  coordinatesText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cameraSection: {
    marginBottom: 24,
  },
  cameraPlaceholder: {
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    padding: 48,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderStyle: "dashed",
  },
  cameraPlaceholderText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: "center",
  },
  cameraPlaceholderSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  controlsSection: {
    marginBottom: 24,
  },
  controlButton: {
    marginBottom: 12,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.surface,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 24,
    textAlign: "center",
  },
  connectionOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  connectionOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  connectionOptionText: {
    marginLeft: 16,
    flex: 1,
  },
  connectionOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  connectionOptionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
  },
  manualControlGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  manualControlButton: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  inputSubLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  input: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  fullWidthButton: {
    marginBottom: 12,
  },
  missionList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  missionItem: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  missionItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  missionItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  missionItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  missionItemDetails: {
    flexDirection: "row",
    gap: 16,
    marginLeft: 36,
  },
  missionItemDetail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emergencyModalContent: {
    alignItems: "center",
  },
  emergencyModalTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.error,
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  emergencyModalText: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 24,
  },
  emergencyModalWarning: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.error,
    textAlign: "center",
    marginBottom: 24,
  },
  emergencyButton: {
    backgroundColor: colors.error,
  },
});
