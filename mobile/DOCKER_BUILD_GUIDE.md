# 🐳 Docker Build Guide - SnapOn Mobile

## Mục đích

Hướng dẫn sử dụng Docker để build file `.aab` (Android App Bundle) cho SnapOn Mobile.
Docker đảm bảo **mọi thành viên đều build trong cùng một môi trường** — không bị lệch phiên bản Node.js, JDK, Android SDK, hay EAS CLI.

### Môi trường đã được pin cố định

| Tool             | Version      | Lý do                          |
|------------------|--------------|--------------------------------|
| Ubuntu           | 22.04        | Base OS ổn định                |
| Node.js          | 20 LTS       | Yêu cầu của Expo SDK 54       |
| JDK              | 17           | Yêu cầu của RN 0.81 / Gradle  |
| Android SDK      | API 36       | RN 0.81 target Android 16     |
| Build Tools      | 35.0.0       | Phù hợp compileSdk 36         |
| NDK              | 27.1.12297006| Cho native modules             |
| EAS CLI          | 20.2.0       | Pinned cho nhất quán           |

---

## 📋 Yêu cầu

- **Docker Desktop** đã cài và đang chạy
  - [Download cho Windows](https://docs.docker.com/desktop/install/windows-install/)
  - [Download cho macOS](https://docs.docker.com/desktop/install/mac-install/)
  - [Download cho Linux](https://docs.docker.com/desktop/install/linux/)
- **Git** để clone repo
- **~10GB dung lượng ổ cứng** (cho Docker image + Android SDK)

---

## 🚀 Hướng dẫn nhanh (Quick Start)

### Bước 1: Tạo EXPO_TOKEN

1. Truy cập [https://expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)
2. Đăng nhập bằng tài khoản Expo (owner: `winkiwar`)
3. Tạo Access Token mới → copy token

4. Tạo file `.env` tại thư mục gốc dự án:
```env
EXPO_TOKEN=your_token_here
```

### Bước 2: Tạo Keystore (chỉ làm 1 lần)

Keystore là file dùng để **ký (sign)** ứng dụng Android. Google Play yêu cầu app phải được ký bằng cùng một keystore.

**Cách 1: Dùng script tự động** (khuyến nghị)
```bash
# Chạy trong Git Bash hoặc WSL
cd mobile
bash scripts/generate-keystore.sh
```

**Cách 2: Tạo thủ công**
```bash
# Tạo thư mục
mkdir -p mobile/keystores

# Tạo keystore
keytool -genkeypair -v \
  -storetype JKS \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_PASSWORD \
  -keypass YOUR_PASSWORD \
  -alias snapon \
  -keystore mobile/keystores/snapon-release.jks \
  -dname "CN=SnapOn, OU=Dev, O=SnapOn Team, L=HCMC, ST=HCMC, C=VN"
```

Sau đó tạo file `mobile/credentials.json`:
```json
{
  "android": {
    "keystore": {
      "keystorePath": "./keystores/snapon-release.jks",
      "keystorePassword": "YOUR_PASSWORD",
      "keyAlias": "snapon",
      "keyPassword": "YOUR_PASSWORD"
    }
  }
}
```

> ⚠️ **QUAN TRỌNG**: KHÔNG commit `keystores/` và `credentials.json` lên Git!
> Chia sẻ cho team qua Google Drive, email, hoặc password manager.

### Bước 3: Build .aab

**Windows (PowerShell):**
```powershell
# Từ thư mục gốc dự án
docker compose run --rm mobile-build
```

**Linux/macOS:**
```bash
# Hoặc dùng script tiện ích
bash mobile/scripts/build-aab.sh
```

### Bước 4: Lấy file .aab

Sau khi build thành công, file `.aab` sẽ nằm tại:
```
./build-output/SnapOn.aab
```

---

## 📁 Cấu trúc file liên quan

```
SnapOn/
├── docker-compose.yml          # Có service "mobile-build"
├── build-output/               # Thư mục chứa file .aab (tự tạo)
│   └── SnapOn.aab
├── .env                        # EXPO_TOKEN (không commit)
└── mobile/
    ├── Dockerfile              # Build environment definition
    ├── .dockerignore           # Files bỏ qua khi build Docker
    ├── eas.json                # EAS build configuration
    ├── credentials.json        # Keystore credentials (không commit)
    ├── credentials.json.example# Template cho credentials
    ├── keystores/              # Thư mục chứa keystore (không commit)
    │   └── snapon-release.jks
    └── scripts/
        ├── docker-entrypoint.sh    # Script chạy trong Docker
        ├── build-aab.ps1           # Helper script (Windows)
        ├── build-aab.sh            # Helper script (Linux/Mac)
        └── generate-keystore.sh    # Tạo keystore mới
```

---

## ⏱️ Thời gian build dự kiến

| Bước | Lần đầu | Các lần sau |
|------|---------|-------------|
| Build Docker image | 10-20 phút | ⏭️ Skip (cached) |
| npm ci | 2-5 phút | 1-3 phút (nếu ko đổi deps) |
| expo prebuild | 1-2 phút | 1-2 phút |
| Gradle bundleRelease | 5-15 phút | 3-8 phút |
| **Tổng** | **~20-40 phút** | **~5-15 phút** |

---

## 🔧 Tuỳ chỉnh

### Đổi tên file output
```bash
AAB_OUTPUT_NAME=SnapOn-v2.aab docker compose run --rm mobile-build
```

### Rebuild Docker image (khi cần update tools)
```bash
docker compose build --no-cache mobile-build
```

### Xem log chi tiết
```bash
docker compose run --rm mobile-build 2>&1 | tee build.log
```

---

## ❓ Troubleshooting

### 1. "Docker daemon is not running"
→ Mở Docker Desktop và đợi nó khởi động xong.

### 2. "EXPO_TOKEN not found"
→ Tạo file `.env` ở thư mục gốc dự án với nội dung:
```
EXPO_TOKEN=your_token_here
```

### 3. "No credentials.json found"
→ Chạy `bash mobile/scripts/generate-keystore.sh` hoặc copy `credentials.json.example` → `credentials.json` và điền thông tin.

### 4. Build quá chậm
- Đảm bảo Docker Desktop được cấp đủ RAM (khuyến nghị ≥ 4GB)
- Windows: Docker Desktop → Settings → Resources → Memory ≥ 4096 MB
- Kiểm tra ổ cứng còn trống ≥ 10GB

### 5. "SDK license not accepted"
→ Đã được xử lý tự động trong Dockerfile. Nếu vẫn lỗi, rebuild image:
```bash
docker compose build --no-cache mobile-build
```

### 6. Permission denied trên Linux/macOS
```bash
chmod +x mobile/scripts/*.sh
```

### 7. Lỗi "versionCode already used" trên Google Play
→ Tăng `versionCode` trong `app.json` > `expo.android.versionCode` trước khi build.

---

## 🔄 Khi nào cần rebuild Docker image?

| Thay đổi | Cần rebuild? |
|----------|-------------|
| Sửa code TypeScript/JSX | ❌ Không |
| Thêm/xóa npm package | ❌ Không (npm ci chạy mỗi lần) |
| Đổi Expo SDK version | ✅ Có |
| Cập nhật JDK/Android SDK | ✅ Có |
| Sửa Dockerfile | ✅ Có |

Cách rebuild:
```bash
docker compose build mobile-build
```

---

## 📱 Upload lên Google Play Console

1. Truy cập [Google Play Console](https://play.google.com/console)
2. Chọn app **SnapOn**
3. Vào **Testing** → **Internal testing**
4. Tạo release mới → Upload file `SnapOn.aab`
5. Điền release notes → Review → Start rollout

---

## 🤝 Chia sẻ Keystore cho team member mới

1. Gửi 2 file cho team member (qua kênh bảo mật):
   - `mobile/keystores/snapon-release.jks`
   - `mobile/credentials.json`
2. Team member đặt file vào đúng đường dẫn
3. Chạy `docker compose run --rm mobile-build`
