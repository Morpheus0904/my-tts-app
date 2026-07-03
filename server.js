const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// =========================
// 环境变量
// =========================
const APPID = (process.env.APPID || "").trim();
const API_KEY = (process.env.API_KEY || "").trim();
const API_SECRET = (process.env.APISECRET || "").trim();

// =========================
// 讯飞TTS接口
// =========================
const TTS_URL = "https://tts-api.xfyun.cn/v2/tts";
const HOST = "tts-api.xfyun.cn";

// =========================
// 拼音映射（你原来的保留）
// =========================
const pinyinMap = {
  a: "啊", o: "哦", e: "鹅", i: "衣", u: "乌", ü: "鱼",
  wǒ: "我", nǐ: "你", tā: "他",
};

// =========================
// 拼音转文本（简化安全版）
// =========================
function buildText(text) {
  return text.replace(/\s+/g, "");
}

// =========================
// 生成鉴权
// =========================
function getAuth() {
  const date = new Date().toUTCString();

  const signatureOrigin =
    `host: ${HOST}\n` +
    `date: ${date}\n` +
    `POST /v2/tts HTTP/1.1`;

  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(signatureOrigin)
    .digest("base64");

  const authorization = `api_key="${API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;

  return { authorization, date };
}

// =========================
// 核心TTS函数（HTTP稳定版）
// =========================
async function textToSpeech(text) {
  const { authorization, date } = getAuth();

  const response = await axios.post(
    TTS_URL,
    {
      common: { app_id: APPID },
      business: {
        aue: "lame", // mp3（稳定）
        auf: "audio/L16;rate=16000",
        vcn: "xiaoyan",
        speed: 50,
        pitch: 50,
        volume: 50
      },
      data: {
        status: 2,
        text: Buffer.from(text).toString("base64")
      }
    },
    {
      headers: {
        Authorization: authorization,
        Date: date,
        Host: HOST,
        "Content-Type": "application/json"
      },
      responseType: "arraybuffer"
    }
  );

  return response.data;
}

// =========================
// API接口
// =========================
app.get("/tts", async (req, res) => {
  const text = req.query.text || "你好";
  console.log("📢 TTS请求:", text);

  if (!APPID || !API_KEY || !API_SECRET) {
    return res.status(500).send("缺少环境变量");
  }

  try {
    const cleanText = buildText(text);
    const audio = await textToSpeech(cleanText);

    res.set({
      "Content-Type": "audio/mp3",
      "Content-Length": audio.length
    });

    res.send(audio);
  } catch (err) {
    console.error("❌ TTS失败:", err?.response?.data || err.message);
    res.status(500).send("TTS失败");
  }
});

// =========================
// 静态页面
// =========================
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/test", (req, res) => {
  res.send("OK - TTS HTTP版运行正常");
});

// =========================
// 启动服务
// =========================
app.listen(port, () => {
  console.log("🚀 服务启动成功");
  console.log("http://localhost:" + port);
});
