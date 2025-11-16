
import React, { useState, useEffect } from "react";
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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import { getAccessKey } from "@/utils/apiClient";

interface TeamMember {
  id: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "pending";
  invited_date: string;
  invited_by: string;
}

export default function ProjectTeamScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const projectId = params.projectId as string;
  const projectName = params.projectName as string;
  const isAdmin = params.isAdmin === "true";

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  useEffect(() => {
    loadTeamMembers();
    loadCurrentUser();
  }, [projectId]);

  const loadCurrentUser = async () => {
    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        console.log("No access key found");
        return;
      }

      // In a real implementation, you would fetch the current user's email from the API
      // For now, we'll use a placeholder
      setCurrentUserEmail("current.user@example.com");
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  const loadTeamMembers = async () => {
    setIsLoading(true);
    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        Alert.alert("Error", "Please login first");
        router.replace("/(tabs)/(home)/");
        return;
      }

      // TODO: Implement API call to fetch team members
      // const result = await getProjectTeamMembers(accessKey, projectId);
      
      // Mock data for demonstration
      const mockTeamMembers: TeamMember[] = [
        {
          id: "1",
          email: "admin@example.com",
          role: "admin",
          status: "active",
          invited_date: new Date().toISOString(),
          invited_by: "system",
        },
      ];

      setTeamMembers(mockTeamMembers);
    } catch (error) {
      console.error("Error loading team members:", error);
      Alert.alert("Error", "Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    if (!validateEmail(inviteEmail.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    // Check if user is already a team member
    const existingMember = teamMembers.find(
      (member) => member.email.toLowerCase() === inviteEmail.trim().toLowerCase()
    );

    if (existingMember) {
      Alert.alert("Error", "This user is already a team member");
      return;
    }

    setIsInviting(true);

    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        Alert.alert("Error", "Please login first");
        return;
      }

      // TODO: Implement API call to invite user
      // const result = await inviteProjectTeamMember(accessKey, projectId, inviteEmail.trim());

      // Mock success for demonstration
      const newMember: TeamMember = {
        id: Date.now().toString(),
        email: inviteEmail.trim(),
        role: "user",
        status: "pending",
        invited_date: new Date().toISOString(),
        invited_by: currentUserEmail,
      };

      setTeamMembers([...teamMembers, newMember]);
      setInviteEmail("");
      setShowInviteModal(false);

      Alert.alert(
        "Invitation Sent! 📧",
        `An invitation has been sent to ${inviteEmail.trim()}. They will be able to view the project and download media once they accept.`
      );
    } catch (error) {
      console.error("Error inviting user:", error);
      Alert.alert("Error", "Failed to send invitation. Please try again.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveUser = (member: TeamMember) => {
    if (member.role === "admin") {
      Alert.alert("Error", "Cannot remove the project admin");
      return;
    }

    Alert.alert(
      "Remove Team Member",
      `Are you sure you want to remove ${member.email} from this project?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const accessKey = await getAccessKey();
              if (!accessKey) {
                Alert.alert("Error", "Please login first");
                return;
              }

              // TODO: Implement API call to remove user
              // const result = await removeProjectTeamMember(accessKey, projectId, member.id);

              // Mock success for demonstration
              setTeamMembers(teamMembers.filter((m) => m.id !== member.id));

              Alert.alert("Success", "Team member removed successfully");
            } catch (error) {
              console.error("Error removing user:", error);
              Alert.alert("Error", "Failed to remove team member");
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    return role === "admin" ? colors.primary : colors.textSecondary;
  };

  const getStatusColor = (status: string) => {
    return status === "active" ? colors.success : colors.warning;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopographicBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading team members...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          Team Members
        </Text>
        {isAdmin && (
          <Pressable
            onPress={() => setShowInviteModal(true)}
            style={styles.addButton}
          >
            <IconSymbol
              ios_icon_name="person.badge.plus"
              android_material_icon_name="person_add"
              size={24}
              color={colors.primary}
            />
          </Pressable>
        )}
        {!isAdmin && <View style={styles.placeholder} />}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.projectInfo}>
          <Text style={styles.projectName}>{projectName}</Text>
          <Text style={styles.projectSubtitle}>
            Manage team access and permissions
          </Text>
        </View>

        {!isAdmin && (
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              Only the project admin can add or remove team members.
            </Text>
          </View>
        )}

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <IconSymbol
              ios_icon_name="person.3.fill"
              android_material_icon_name="groups"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.statValue}>{teamMembers.length}</Text>
            <Text style={styles.statLabel}>Team Members</Text>
          </View>
          <View style={styles.statItem}>
            <IconSymbol
              ios_icon_name="person.badge.shield.checkmark.fill"
              android_material_icon_name="admin_panel_settings"
              size={32}
              color={colors.primaryDark}
            />
            <Text style={styles.statValue}>
              {teamMembers.filter((m) => m.role === "admin").length}
            </Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Team Members</Text>

        {teamMembers.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberHeader}>
              <View style={styles.memberIconContainer}>
                <IconSymbol
                  ios_icon_name={
                    member.role === "admin"
                      ? "person.badge.shield.checkmark.fill"
                      : "person.fill"
                  }
                  android_material_icon_name={
                    member.role === "admin" ? "admin_panel_settings" : "person"
                  }
                  size={24}
                  color={getRoleColor(member.role)}
                />
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberEmail}>{member.email}</Text>
                <View style={styles.memberMeta}>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: getRoleColor(member.role) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        { color: getRoleColor(member.role) },
                      ]}
                    >
                      {member.role.toUpperCase()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(member.status) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(member.status) },
                      ]}
                    >
                      {member.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.memberDate}>
                  Invited: {new Date(member.invited_date).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {isAdmin && member.role !== "admin" && (
              <Pressable
                style={styles.removeButton}
                onPress={() => handleRemoveUser(member)}
              >
                <IconSymbol
                  ios_icon_name="trash.fill"
                  android_material_icon_name="delete"
                  size={20}
                  color={colors.error}
                />
              </Pressable>
            )}
          </View>
        ))}

        {isAdmin && (
          <View style={styles.permissionsSection}>
            <Text style={styles.sectionTitle}>Team Permissions</Text>
            <View style={styles.permissionCard}>
              <View style={styles.permissionRow}>
                <IconSymbol
                  ios_icon_name="eye.fill"
                  android_material_icon_name="visibility"
                  size={20}
                  color={colors.success}
                />
                <Text style={styles.permissionText}>View project details</Text>
              </View>
              <View style={styles.permissionRow}>
                <IconSymbol
                  ios_icon_name="arrow.down.circle.fill"
                  android_material_icon_name="download"
                  size={20}
                  color={colors.success}
                />
                <Text style={styles.permissionText}>Download media files</Text>
              </View>
              <View style={styles.permissionRow}>
                <IconSymbol
                  ios_icon_name="cube.fill"
                  android_material_icon_name="view_in_ar"
                  size={20}
                  color={colors.success}
                />
                <Text style={styles.permissionText}>Download 3D models</Text>
              </View>
              <View style={styles.permissionRow}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={20}
                  color={colors.error}
                />
                <Text style={styles.permissionText}>
                  Cannot add/remove team members (Admin only)
                </Text>
              </View>
              <View style={styles.permissionRow}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={20}
                  color={colors.error}
                />
                <Text style={styles.permissionText}>
                  Cannot delete project (Admin only)
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Copyright Notices */}
        <View style={styles.copyrightSection}>
          <Text style={styles.copyrightText}>
            © DronE1337 - All rights reserved
          </Text>
          <Text style={styles.copyrightText}>
            © PhotoForge - All rights reserved
          </Text>
        </View>
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowInviteModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Team Member</Text>
              <Pressable
                onPress={() => setShowInviteModal(false)}
                style={styles.modalCloseButton}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.textPrimary}
                />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                Enter the email address of the person you want to invite to this
                project. They will receive an invitation and be able to view the
                project and download media files.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="user@example.com"
                  placeholderTextColor={colors.textSecondary}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.roleInfoBox}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.roleInfoText}>
                  New members will be added as regular users with view and
                  download permissions.
                </Text>
              </View>

              <Button
                onPress={handleInviteUser}
                loading={isInviting}
                disabled={isInviting}
                style={styles.inviteButton}
              >
                Send Invitation
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
    marginHorizontal: 8,
  },
  addButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  projectInfo: {
    marginBottom: 24,
  },
  projectName: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  projectSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.primary + "20",
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    gap: 32,
    justifyContent: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  memberIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundLight,
    justifyContent: "center",
    alignItems: "center",
  },
  memberInfo: {
    flex: 1,
  },
  memberEmail: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  memberMeta: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  memberDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  removeButton: {
    padding: 8,
  },
  permissionsSection: {
    marginTop: 32,
  },
  permissionCard: {
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },
  copyrightSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.accentBorder,
    alignItems: "center",
    gap: 8,
  },
  copyrightText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "android" ? 24 : 0,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.accentBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
  },
  modalDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.backgroundLight,
    color: colors.textPrimary,
  },
  roleInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    backgroundColor: colors.primary + "20",
    borderRadius: 8,
    gap: 8,
    marginBottom: 24,
  },
  roleInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  inviteButton: {
    marginTop: 8,
  },
});
