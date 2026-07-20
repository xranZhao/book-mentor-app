// Book Mentor · 配置
const CONFIG = {
  API_KEY: "",
  BASE_URL: "https://api.deepseek.com/v1/chat/completions",
  MODEL: "deepseek-v4-flash",  // DeepSeek 最新 V4 Flash（¥1/M in, ¥2/M out）
  APP_NAME: "Book Mentor",
  MAX_HISTORY: 50,
};

function loadUserConfig() {
  try {
    const saved = localStorage.getItem("bm_user_config");
    if (saved) {
      const user = JSON.parse(saved);
      if (user.MODEL && (user.MODEL.startsWith("sk-") || user.MODEL.length > 40)) {
        user.MODEL = "deepseek-v4-flash";
      }
      if (user.BASE_URL && (user.BASE_URL.startsWith("sk-") || user.BASE_URL.length > 100)) {
        user.BASE_URL = "https://api.deepseek.com/v1/chat/completions";
      }
      Object.assign(CONFIG, user);
    }
  } catch (e) {
    console.error("加载配置失败", e);
  }
}
loadUserConfig();
