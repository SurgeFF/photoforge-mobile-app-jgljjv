
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
  battery: number;
  voltage: number;
  cell_status: string;
  latitude: number;
  longitude: number;
  altitude: number;
  satellite_count: number;
  speed: number;
  distance_from_home: number;
  flight_time: number;
  gimbal_pitch: number;
  gimbal_roll: number;
  gimbal_yaw: number;
  status: string;
  armed: boolean;
  flying: boolean;
  returning_home: boolean;
  error_codes: string[];
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
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Cleanup WebSocket on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Simulate WebSocket telemetry updates
  useEffect(() => {
    if (droneStatus.connected && droneStatus.telemetry_ws_url) {
      // In a real implementation, connect to WebSocket here
      // For now, simulate periodic updates
      const interval = setInterval(() => {
        setDroneStatus((prev) => {
          if (!prev.telemetry) return prev;
          
          return {
            ...prev,
            telemetry: {
              ...prev.telemetry,
              battery: Math.max(0, prev.telemetry.battery - 0.1),
              altitude: prev.telemetry.altitude + (Math.random() - 0.5) * 0.5,
              speed: Math.max(0, prev.telemetry.speed + (Math.random() - 0.5) * 0.2),
              flight_time: prev.telemetry.flight_time + 0.1,
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
        // Initialize telemetry data
        const initialTelemetry: TelemetryData = {
          battery: 95,
          voltage: 12.6,
          cell_status: "Good",
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 0,
          satellite_count: 18,
          speed: 0,
          distance_from_home: 0,
          flight_time: 0,
          gimbal_pitch: -90,
          gimbal_roll: 0,
          gimbal_yaw: 0,
          status: "Ready",
          armed: false,
          flying: false,
          returning_home: false,
          error_codes: [],
        };

        setDroneStatus({
          connected: true,
          model: result.data.model || "DJI Mavic 3",
          firmware: result.data.firmware || "v2.0.8",
          serial_number: result.data.serial_number || "1234567890ABCDEF",
          telemetry: initialTelemetry,
          telemetry_ws_url: "ws://drone-telemetry.local:8080",
        });
        
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
              armed: true,
              flying: true,
              status: "Flying",
            },
          });
        } else if (command === "land" && droneStatus.telemetry) {
          setDroneStatus({
            ...droneStatus,
            telemetry: {
              ...droneStatus.telemetry,
              flying: false,
              status: "Landing",
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
                      returning_home: true,
                      status: "Returning Home",
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
                    ? colors.success
                    : colors.textSecondary,
                },
              ]}
            />
          </View>
          <Text style={styles.statusTitle}>
            {droneStatus.connected ? "Connected" : "Disconnected"}
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
                    color={getBatteryColor(droneStatus.telemetry.battery)}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.battery.toFixed(1)}%
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
                    {droneStatus.telemetry.voltage.toFixed(1)}V
                  </Text>
                  <Text style={styles.telemetryLabel}>Voltage</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={24}
                    color={colors.success}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.cell_status}
                  </Text>
                  <Text style={styles.telemetryLabel}>Cell Status</Text>
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
                    color={getGPSColor(droneStatus.telemetry.satellite_count)}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.satellite_count}
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
                    {droneStatus.telemetry.altitude.toFixed(1)}m
                  </Text>
                  <Text style={styles.telemetryLabel}>Altitude</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="house.fill"
                    android_material_icon_name="home"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.distance_from_home.toFixed(0)}m
                  </Text>
                  <Text style={styles.telemetryLabel}>From Home</Text>
                </View>
              </View>
              <View style={styles.coordinatesCard}>
                <Text style={styles.coordinatesText}>
                  Lat: {droneStatus.telemetry.latitude.toFixed(6)}°
                </Text>
                <Text style={styles.coordinatesText}>
                  Lon: {droneStatus.telemetry.longitude.toFixed(6)}°
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
                    {droneStatus.telemetry.speed.toFixed(1)} m/s
                  </Text>
                  <Text style={styles.telemetryLabel}>Speed</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name="clock.fill"
                    android_material_icon_name="schedule"
                    size={24}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.telemetryValue}>
                    {Math.floor(droneStatus.telemetry.flight_time / 60)}:
                    {Math.floor(droneStatus.telemetry.flight_time % 60)
                      .toString()
                      .padStart(2, "0")}
                  </Text>
                  <Text style={styles.telemetryLabel}>Flight Time</Text>
                </View>
                <View style={styles.telemetryCard}>
                  <IconSymbol
                    ios_icon_name={
                      droneStatus.telemetry.flying
                        ? "airplane"
                        : "airplane.departure"
                    }
                    android_material_icon_name={
                      droneStatus.telemetry.flying ? "flight" : "flight_takeoff"
                    }
                    size={24}
                    color={droneStatus.telemetry.flying ? colors.success : colors.textSecondary}
                  />
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.status}
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
                    {droneStatus.telemetry.gimbal_pitch.toFixed(1)}°
                  </Text>
                </View>
                <View style={styles.telemetryCard}>
                  <Text style={styles.gimbalLabel}>Roll</Text>
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.gimbal_roll.toFixed(1)}°
                  </Text>
                </View>
                <View style={styles.telemetryCard}>
                  <Text style={styles.gimbalLabel}>Yaw</Text>
                  <Text style={styles.telemetryValue}>
                    {droneStatus.telemetry.gimbal_yaw.toFixed(1)}°
                  </Text>
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
              ? "Telemetry updates 10 times per second. Always maintain visual line of sight with your drone."
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
});
