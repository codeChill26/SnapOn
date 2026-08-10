import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error('ErrorBoundary caught an uncaught React error:', error, errorInfo);
    }
  }

  private handleReloadApp = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Text style={styles.emoji}>⚠️</Text>
            </View>
            <Text style={styles.title}>Đã xảy ra lỗi không mong muốn</Text>
            <Text style={styles.subtitle}>
              Ứng dụng gặp sự cố trong quá trình hiển thị giao diện. Bạn có thể nhấn nút bên dưới để khôi phục.
            </Text>
            {__DEV__ && (
              <View style={styles.debugBox}>
                <Text style={styles.debugText}>{this.state.error?.toString()}</Text>
                <Text style={styles.debugSubtext}>Nhấp để thử tải lại hoặc quay lại màn hình trước đó.</Text>
              </View>
            )}
            <TouchableOpacity style={styles.button} onPress={this.handleReloadApp} activeOpacity={0.8}>
              <Text style={styles.buttonText}>Tải lại trang</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF1EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  debugBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  debugText: {
    fontSize: 12,
    color: '#EF4444',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  debugSubtext: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
  },
  button: {
    backgroundColor: '#FF6B35', // SnapOn Primary Brand Color
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
