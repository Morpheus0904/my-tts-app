const express = require('express');
const crypto = require('crypto');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// ================================================================
// 环境变量（Render / Railway 中设置）
//   APPID     = 40131eae
//   API_KEY   = a3d82f6eca521d711f87c057e06d6bbf
//   APISECRET = ZDlyzDg3OTQ3MTBhMjZkYzllYzQxNmMz
// ================================================================
const APPID = (process.env.APPID || '').trim();
const API_KEY = (process.env.API_KEY || '').trim();
const API_SECRET = (process.env.APISECRET || '').trim();

// ================================================================
// 讯飞服务域名（⚠️ 请确保拼写为 xfyun，不是 xfyn 或 xyfun）
// ================================================================
const TTS_HOST = 'tts-api.xfyun.cn';

// ================================================================
// 拼音 → 汉字映射表（覆盖全部14天内容）
// ================================================================
const pinyinMap = {
  // 单韵母 & 整体认读
  'a':'啊','o':'哦','e':'鹅','i':'衣','u':'乌','ü':'鱼',
  'ā':'阿','á':'啊','ǎ':'啊','à':'阿','ō':'喔','ó':'哦','ǒ':'哦','ò':'哦',
  'ē':'诶','é':'鹅','ě':'诶','è':'诶','ī':'衣','í':'姨','ǐ':'以','ì':'义',
  'ū':'乌','ú':'无','ǔ':'五','ù':'物','ǖ':'鱼','ǘ':'鱼','ǚ':'雨','ǜ':'玉',
  // 声母+韵母常用字
  'bā':'八','bá':'拔','bǎ':'把','bà':'爸','bō':'波','pō':'坡','pó':'婆','pǒ':'叵',
  'mō':'摸','mó':'模','mǒ':'抹','mò':'墨','fó':'佛','mā':'妈','má':'麻','mǎ':'马','mà':'骂',
  'fā':'发','fá':'罚','fǎ':'法','fà':'发','dā':'搭','dá':'答','dǎ':'打','dà':'大',
  'tā':'他','tá':'塔','tǎ':'塔','tà':'踏','nā':'那','ná':'拿','nǎ':'哪','nà':'那',
  'lā':'拉','lá':'拉','lǎ':'啦','là':'辣','gē':'哥','gé':'格','gě':'个','gè':'个',
  'kē':'科','ké':'壳','kě':'可','kè':'课','hē':'喝','hé':'和','hě':'贺','hè':'贺',
  'jī':'机','jí':'及','jǐ':'几','jì':'记','qī':'七','qí':'骑','qǐ':'起','qì':'气',
  'xī':'西','xí':'习','xǐ':'洗','xì':'戏','zhī':'知','zhí':'直','zhǐ':'指','zhì':'治',
  'chī':'吃','chí':'池','chǐ':'尺','chì':'赤','shī':'诗','shí':'十','shǐ':'使','shì':'是',
  'rì':'日','zī':'资','cí':'词','zǐ':'子','cì':'次','sī':'思','sì':'四',
  'yī':'衣','yí':'姨','yǐ':'以','yì':'义','wū':'乌','wú':'无','wǔ':'五','wù':'物',
  'yū':'淤','yú':'鱼','yǔ':'雨','yù':'玉','yē':'耶','yé':'椰','yě':'也','yè':'叶',
  'yuē':'约','yuè':'月','ér':'儿','ěr':'耳','èr':'二',
  // 复韵母
  'bái':'白','mǎi':'买','tái':'台','cài':'菜','léi':'雷','méi':'梅','gài':'盖','guī':'归',
  'kuí':'奎','huí':'回','duī':'堆','tuǐ':'腿','pái':'排','wèi':'位','tuī':'推','gěi':'给',
  'fēi':'飞','lài':'赖','lái':'来','nǎi':'奶','něi':'哪','bēi':'杯','bǎo':'宝','táo':'桃',
  'shǎo':'少','rào':'绕','tóu':'头','gǒu':'狗','lòu':'漏','zhōu':'周','jiǔ':'九','xiū':'休',
  'lǎo':'老','dǒu':'斗','chou':'抽','liú':'留','gāo':'高','gōu':'沟','kǎo':'考','kǒu':'口',
  'zǒu':'走','zuǒ':'左','xiǎo':'小','qiáo':'桥','biē':'憋','piē':'瞥','miē':'咩','diē':'爹',
  'tiē':'贴','niē':'捏','jié':'节','qié':'茄','xié':'鞋','jué':'决','qué':'缺','xué':'学',
  'lǜe':'略','nǜe':'虐','bàn':'半','dān':'单','zhàn':'站','fēn':'分','zěn':'怎','kěn':'肯',
  'shēn':'深','qīn':'亲','yǐn':'饮','rán':'然','chēn':'嗔','biǎn':'扁','piàn':'片','miàn':'面',
  'tián':'田','niǎn':'撵','juàn':'卷','quān':'圈','xuàn':'炫','shuān':'栓','chuán':'船',
  'gān':'干','gāi':'该','kān':'看','kuān':'宽','guān':'关','xiàn':'现','dūn':'蹲','gùn':'棍',
  'zhǔn':'准','lún':'轮','tūn':'吞','hūn':'昏','chūn':'春','shùn':'顺','sūn':'孙','jūn':'军',
  'nǚ':'女','qún':'群','xùn':'训','yūn':'晕','yuán':'元','yuǎn':'远','yùn':'运','duān':'端',
  'bàng':'棒','máng':'忙','làng':'浪','fàng':'放','zhāng':'张','dèng':'邓','héng':'恒',
  'cēng':'蹭','dōng':'东','lóng':'龙','zhōng':'中','chōng':'冲','yíng':'英','sǒng':'耸',
  'róng':'荣','guàng':'逛','chuáng':'床','jiāng':'江','nán':'南','hǎo':'好','jǐng':'景',
  'jiù':'旧','céng':'曾','ān':'安','chū':'出','hóng':'红','shèng':'胜','huǒ':'火','shuǐ':'水',
  'lǜ':'绿','rú':'如','lán':'蓝','bù':'不','yóu':'油','yìn':'印','shù':'树','lín':'林',
  'zhēn':'针','nán':'南','guā':'瓜','yuàn':'愿','sǔn':'笋','yùn':'韵','mǔ':'母','jūn':'军',
  'wén':'蚊','zhú':'竹','chūn':'春','jī':'鸡','dàn':'蛋','kùn':'困','lún':'轮','piān':'偏',
  'cūn':'村','quán':'拳','bēn':'奔','pǎo':'跑','kè':'课','běn':'本','bèi':'背','xīn':'心',
  'jīn':'今','tiān':'天','hēi':'黑','bǎn':'板','méi':'每','dōu':'都','qù':'去','pá':'爬',
  'dú':'读','yǔ':'语','kōng':'空','zhōng':'中','piāo':'飘','zhe':'着','xiāo':'消','miè':'灭',
  'rèn':'认','zhēn':'真','xué':'学','qiáo':'桥','lǎo':'老','yīng':'鹰','dà':'大','niáng':'娘',
  'mì':'蜜','fēng':'蜂','fàng':'放','tǒng':'桶','gōng':'工','chǎng':'厂','nóng':'农','cāng':'苍',
  'léi':'雷','hóng':'红','qí':'旗','jiě':'解','fàng':'放'
};

// ================================================================
// 工具函数：带声调拼音 → 数字声调格式（如 wǒ → wo3）
// ================================================================
function pinyinToToneNumber(py) {
  const toneMap = {
    'ā':'a1','á':'a2','ǎ':'a3','à':'a4',
    'ō':'o1','ó':'o2','ǒ':'o3','ò':'o4',
    'ē':'e1','é':'e2','ě':'e3','è':'e4',
    'ī':'i1','í':'i2','ǐ':'i3','ì':'i4',
    'ū':'u1','ú':'u2','ǔ':'u3','ù':'u4',
    'ǖ':'v1','ǘ':'v2','ǚ':'v3','ǜ':'v4'
  };
  let result = py;
  for (const [vowel, replacement] of Object.entries(toneMap)) {
    if (py.includes(vowel)) {
      result = py.replace(vowel, replacement.replace(/\d$/, ''));
      if (!result.match(/\d$/)) {
        const num = replacement.match(/\d$/)[0];
        result = result + num;
      }
      break;
    }
  }
  if (!result.match(/\d$/)) {
    result = result + '5';
  }
  return result;
}

// ================================================================
// 构建讯飞 phoneme 标签
// ================================================================
function buildPhonemeText(text) {
  const words = text.split(/\s+/);
  let result = '';
  for (const w of words) {
    if (!w) continue;
    const clean = w.replace(/[，。、？！；：""''（）\.,;:!?]/g, '');
    if (!clean) {
      result += w;
      continue;
    }
    const char = pinyinMap[clean] || clean;
    const tonePy = pinyinToToneNumber(clean);
    result += `<phoneme py="${tonePy}">${char}</phoneme>`;
  }
  return result;
}

// ================================================================
// 生成鉴权 URL（使用 TTS_HOST 常量）
// ================================================================
function generateAuthUrl() {
  // 完整代码太长，我将提供关键部分：
// 在 generateAuthUrl 开头添加：
console.log('🔑 APPID 长度:', APPID.length);
console.log('🔑 API_KEY 长度:', API_KEY.length);
console.log('🔑 API_SECRET 长度:', API_SECRET.length);
  const date = new Date().toUTCString();
  const signatureOrigin = `host: ${TTS_HOST}\ndate: ${date}\nGET /v2/tts HTTP/1.1`;
  console.log('📝 签名原文:', signatureOrigin.replace(/\n/g, '\\n'));

  const signature = crypto.createHmac('sha256', API_SECRET)
      .update(signatureOrigin)
      .digest('base64');

  const authorization = `api_key="${API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  console.log('🔑 Authorization 前100字符:', authorization.substring(0, 100));

  const url = `wss://${TTS_HOST}/v2/tts?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${TTS_HOST}`;
  console.log('🌐 WebSocket URL (前150字符):', url.substring(0, 150) + '...');
  return url;
}

// ================================================================
// 生成 WAV 文件头
// ================================================================
function createWavHeader(dataLength, sampleRate) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

// ================================================================
// 核心路由：/tts
// ================================================================
app.get('/tts', (req, res) => {
  const text = req.query.text || '你好';
  console.log(`📢 收到发音请求: ${text}`);

  if (!APPID || !API_KEY || !API_SECRET) {
    console.error('❌ 环境变量未设置');
    return res.status(500).send('服务器未配置讯飞密钥');
  }

  const ttsText = buildPhonemeText(text);
  console.log('📝 TTS文本:', ttsText);

  const wsUrl = generateAuthUrl();
  const ws = new WebSocket(wsUrl);
  let audioChunks = [];
  let isEnd = false;
  let hasError = false;
  let responseSent = false;

  const sendResponse = (status, message, data) => {
    if (responseSent) return;
    responseSent = true;
    if (data) {
      res.set('Content-Type', 'audio/wav');
      res.send(data);
    } else {
      res.status(status).send(message);
    }
  };

  ws.on('open', () => {
    console.log('✅ WebSocket 连接已打开');
    const params = {
      common: { app_id: APPID },
      business: {
        aue: 'raw',
        auf: 'audio/L16;rate=16000',
        vcn: 'xiaoyan',
        speed: 40,
        pitch: 50,
        volume: 50
      },
      data: {
        status: 1,
        text: Buffer.from(ttsText).toString('base64')
      }
    };
    ws.send(JSON.stringify(params));
  });

  ws.on('message', (data) => {
    try {
      const resp = JSON.parse(data);
      if (resp.code !== 0) {
        console.error('❌ 讯飞错误码:', resp.code, '消息:', resp.message);
        hasError = true;
        sendResponse(500, '讯飞错误: ' + resp.code + ' ' + resp.message);
        ws.close();
        return;
      }
      if (resp.data?.audio) {
        audioChunks.push(Buffer.from(resp.data.audio, 'base64'));
      }
      if (resp.data?.status === 2) {
        isEnd = true;
        ws.close();
      }
    } catch (e) {
      console.error('❌ 解析响应失败:', e);
      hasError = true;
      sendResponse(500, '解析响应失败');
      ws.close();
    }
  });

  ws.on('close', () => {
    if (responseSent) return;
    if (hasError) {
      sendResponse(500, '合成错误');
      return;
    }
    if (isEnd && audioChunks.length > 0) {
      console.log(`✅ 合成完成，音频大小: ${audioChunks.reduce((s, b) => s + b.length, 0)} 字节`);
      const pcm = Buffer.concat(audioChunks);
      const wav = createWavHeader(pcm.length, 16000);
      sendResponse(200, null, Buffer.concat([wav, pcm]));
    } else {
      sendResponse(500, '合成失败或音频为空');
    }
  });

  ws.on('error', (err) => {
    console.error('❌ WebSocket错误:', err.message);
    hasError = true;
    sendResponse(500, 'WebSocket连接失败: ' + err.message);
    ws.close();
  });
});

// ================================================================
// 静态文件服务
// ================================================================
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/test', (req, res) => {
  res.send('✅ 服务器运行正常！');
});

// ================================================================
// 启动服务器
// ================================================================
app.listen(port, () => {
  console.log(`✅ 服务已启动: http://localhost:${port}`);
  console.log(`   - 前端: http://localhost:${port}`);
  console.log(`   - TTS接口: http://localhost:${port}/tts?text=wǒ`);
  console.log(`   - 测试路由: http://localhost:${port}/test`);
});
