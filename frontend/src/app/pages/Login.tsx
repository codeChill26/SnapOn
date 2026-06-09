import { useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
} from "../../imports/authService";
import { useApp } from "../context/AppContext";

export default function Login() {
  const navigate = useNavigate();
  const { fetchProfile } = useApp();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const syncUserWithBackend = async (token: string) => {
    const response = await fetch("http://localhost:3000/api/auth/sync-user", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Không thể đồng bộ user với backend.");
    }

    return data;
  };
  const handleEmailAuth = async () => {
    try {
      setLoading(true);
      setError("");

      const user = isRegisterMode
        ? await registerWithEmail(email, password)
        : await loginWithEmail(email, password);

      const token = await user.getIdToken();

      const syncData = await syncUserWithBackend(token);

      localStorage.setItem("firebaseToken", token);
      localStorage.setItem("appUser", JSON.stringify(syncData.user));
      localStorage.setItem("wallet", JSON.stringify(syncData.wallet));

      console.log("Synced user:", syncData);
      
      // Update global context
      await fetchProfile();

      navigate("/");
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
  try {
    setLoading(true);
    setError("");

    const user = await loginWithGoogle();
    const token = await user.getIdToken();

    const syncData = await syncUserWithBackend(token);

    localStorage.setItem("firebaseToken", token);
    localStorage.setItem("appUser", JSON.stringify(syncData.user));
    localStorage.setItem("wallet", JSON.stringify(syncData.wallet));

    console.log("Synced Google user:", syncData);
    
    // Update global context
    await fetchProfile();

    navigate("/");
  } catch (err: any) {
    setError(err.message || "Đăng nhập Google thất bại.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-orange-100 p-7">
        <div className="text-center mb-7">
          <Link to="/" className="text-orange-500 text-sm font-semibold">
            ← Về trang chủ
          </Link>

          <h1 className="text-gray-900 mt-4 mb-2" style={{ fontWeight: 800, fontSize: "1.8rem" }}>
            {isRegisterMode ? "Tạo tài khoản" : "Đăng nhập"}
          </h1>

          <p className="text-gray-400 text-sm">
            Sử dụng Gmail hoặc đăng nhập nhanh bằng Google
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 font-semibold">
              Gmail
            </label>
            <input
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-orange-400"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 font-semibold">
              Mật khẩu
            </label>
            <input
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-orange-400"
            />
          </div>

          <button
            onClick={handleEmailAuth}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl transition disabled:opacity-60"
            style={{ fontWeight: 700 }}
          >
            {loading
              ? "Đang xử lý..."
              : isRegisterMode
                ? "Đăng ký"
                : "Đăng nhập"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">hoặc</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-xl transition disabled:opacity-60"
            style={{ fontWeight: 700 }}
          >
            Đăng nhập với Google
          </button>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError("");
            }}
            className="text-orange-500 text-sm font-semibold"
          >
            {isRegisterMode
              ? "Đã có tài khoản? Đăng nhập"
              : "Chưa có tài khoản? Đăng ký"}
          </button>
        </div>
      </div>
    </div>
  );
}