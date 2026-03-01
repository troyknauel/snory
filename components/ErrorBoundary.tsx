import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AlertTriangle, RotateCcw } from "lucide-react-native";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage?: string;
};

export class ErrorBoundary extends React.PureComponent<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: undefined,
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const msg = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("[ErrorBoundary] Caught error", { error, info });
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: undefined });
  };

  private handleReport = () => {
    const msg = this.state.errorMessage || "Unknown error";
    try {
      console.log("[ErrorBoundary] Report requested", { msg });
    } catch {
      // ignore
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container} testID="error_boundary">
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <AlertTriangle size={28} color="#7C2D12" />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle} numberOfLines={4}>
            {this.state.errorMessage || "Please try again."}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                this.handleReset();
              }}
              activeOpacity={0.8}
              testID="error_boundary_retry"
            >
              <RotateCcw size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Try again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                this.handleReport();
                Alert.alert("Error details", this.state.errorMessage || "Unknown error");
              }}
              activeOpacity={0.8}
              testID="error_boundary_details"
            >
              <Text style={styles.secondaryBtnText}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FED7AA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  secondaryBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700" as const,
  },
});
