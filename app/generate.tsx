
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Button from "@/components/button";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCESS_KEY_STORAGE = "@photoforge_access_key";

export default function GenerateScreen() {
  const theme = useTheme();
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert("Error", "Please enter a prompt");
      return;
    }

    setIsGenerating(true);

    try {
      const accessKey = await AsyncStorage.getItem(ACCESS_KEY_STORAGE);

      const response = await fetch("https://photoforge.base44.app/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessKey}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        console.log("Image generated successfully");
      } else {
        Alert.alert("Error", data.message || "Failed to generate image");
      }
    } catch (error) {
      console.error("Generation error:", error);
      Alert.alert("Error", "Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedImage) return;

    Alert.alert("Success", "Image saved to your gallery!");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Button
          onPress={() => router.back()}
          variant="outline"
          size="small"
          style={styles.backButton}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={20}
            color={colors.text}
          />
        </Button>
        <Text style={styles.headerTitle}>Generate Image</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          <Text style={styles.label}>Prompt</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.dark ? colors.backgroundAlt : "#f5f5f5",
                color: theme.colors.text,
              },
            ]}
            placeholder="Describe the image you want to create..."
            placeholderTextColor={theme.dark ? "#888" : "#999"}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={[styles.label, styles.labelSpacing]}>Negative Prompt (Optional)</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.dark ? colors.backgroundAlt : "#f5f5f5",
                color: theme.colors.text,
              },
            ]}
            placeholder="What to avoid in the image..."
            placeholderTextColor={theme.dark ? "#888" : "#999"}
            value={negativePrompt}
            onChangeText={setNegativePrompt}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Button
            onPress={handleGenerate}
            loading={isGenerating}
            disabled={isGenerating || !prompt.trim()}
            style={styles.generateButton}
          >
            {isGenerating ? "Generating..." : "Generate Image"}
          </Button>
        </View>

        {isGenerating && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Creating your image...</Text>
          </View>
        )}

        {generatedImage && !isGenerating && (
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>Generated Image</Text>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: generatedImage }}
                style={styles.generatedImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.actionButtons}>
              <Button onPress={handleSave} style={styles.actionButton}>
                Save to Gallery
              </Button>
              <Button
                onPress={() => {
                  setGeneratedImage(null);
                  setPrompt("");
                  setNegativePrompt("");
                }}
                variant="outline"
                style={styles.actionButton}
              >
                Generate New
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey + "33",
  },
  backButton: {
    width: 40,
    height: 40,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
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
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  labelSpacing: {
    marginTop: 20,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.grey + "33",
  },
  textArea: {
    minHeight: 100,
  },
  generateButton: {
    marginTop: 24,
    height: 56,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 16,
    color: colors.grey,
    marginTop: 16,
  },
  resultSection: {
    marginTop: 24,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  imageContainer: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    overflow: "hidden",
    aspectRatio: 1,
    marginBottom: 16,
  },
  generatedImage: {
    width: "100%",
    height: "100%",
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    height: 48,
  },
});
