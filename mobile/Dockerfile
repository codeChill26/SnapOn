# ============================================================
# SnapOn Mobile - Android .aab Build Environment
# 
# Mục đích: Đồng nhất môi trường build giữa các máy trong team
# Sử dụng: eas build --local để build đúng chuẩn Expo
#
# Phiên bản được pin:
#   - Ubuntu 22.04
#   - JDK 17 (yêu cầu của React Native 0.81 / Gradle)
#   - Android SDK: API 36, Build Tools 35.0.0
#   - Node.js 20 LTS (yêu cầu của Expo SDK 54)
#   - EAS CLI (pinned version)
# ============================================================

FROM ubuntu:22.04

# ---- Prevent interactive prompts ----
ENV DEBIAN_FRONTEND=noninteractive

# ---- System Dependencies ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    zip \
    git \
    openjdk-17-jdk-headless \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---- Java Environment ----
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# ---- Android SDK ----
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=$PATH:$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Download Android Command Line Tools
RUN mkdir -p $ANDROID_HOME/cmdline-tools && \
    curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip \
      -o /tmp/cmdline-tools.zip && \
    unzip -q /tmp/cmdline-tools.zip -d $ANDROID_HOME/cmdline-tools && \
    mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest && \
    rm /tmp/cmdline-tools.zip

# Accept all licenses and install SDK components
RUN yes | sdkmanager --licenses > /dev/null 2>&1 && \
    sdkmanager \
      "platforms;android-36" \
      "platforms;android-35" \
      "build-tools;35.0.0" \
      "platform-tools" \
      "ndk;27.1.12297006"

# ---- Node.js 20 LTS ----
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# ---- EAS CLI (pinned version for consistency) ----
RUN npm install -g eas-cli@20.2.0

# ---- Verify installations ----
RUN echo "=== Build Environment ===" && \
    echo "Node.js: $(node -v)" && \
    echo "npm:     $(npm -v)" && \
    echo "Java:    $(java -version 2>&1 | head -1)" && \
    echo "EAS CLI: $(eas --version)" && \
    echo "Android SDK: $ANDROID_HOME" && \
    echo "========================="

# ---- Working directories ----
WORKDIR /build
RUN mkdir -p /output

# ---- Copy entrypoint script ----
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# ---- Entrypoint ----
ENTRYPOINT ["/docker-entrypoint.sh"]
