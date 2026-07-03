const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// ================================================================
// 从环境变量读取百度智能云密钥
// ================================================================
const BAIDU_API_KEY = process.env.BAIDU_API_KEY;
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY;

// 百度TTS API地址（标准版，也兼容大模型）
const BAIDU_TTS_URL = 'https://tsn.baidu.com/text2audio';

// ================================================================
// 拼音 → 汉字映射表（完整14天用到的拼音）
// ================================================================
const pinyinMap = {
  'a':'啊','o':'哦','e':'鹅','i':'衣','u':'乌','ü':'鱼',
  'ā':'阿','á':'啊','ǎ':'啊','à':'阿','ō':'喔','ó':'哦','ǒ':'哦','ò':'哦',
  'ē':'诶','é':'鹅','ě':'诶','è':'诶','ī':'衣','í':'姨','ǐ':'以','ì':'义',
  'ū':'乌','ú':'无','ǔ':'五','ù':'物','ǖ':'鱼','ǘ':'鱼','ǚ':'雨','ǜ':'玉',
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

// 将带声调拼音映射为纯拼音+声调数字 (用于百度TTS)
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

// 将拼音文本转换为汉字文本（用于TTS）
function pinyinToChinese(text) {
  const words = text.split(/\s+/);
  let result = '';
  for (const w of words) {
    if (!w) continue;
    const clean = w.replace(/[，。、？！；：""''（）\.,;:!?]/g, '');
    if (!clean) {
      result += w;
      continue;
    }
    // 尝试映射为汉字
    const char = pinyinMap[clean] || clean;
    result += char;
  }
  return result;
}

// ================================================================
// 获取百度Access Token
// ================================================================
async function getBaiduAccessToken() {
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;
  try {
    const response = await axios.post(url);
    if (response.data.access_token) {
      console.log('✅ 成功获取百度Access Token');
      return response.data.access_token;
    } else {
      throw new Error('获取Access Token失败: ' + JSON.stringify(response.data));
    }
  } catch (error) {
    console.error('❌ 获取百度Access Token错误:', error.message);
    throw error;
  }
}

// ================================================================
// 核心路由：/tts
// ================================================================
app.get('/tts', async (req, res) => {
  const text = req.query.text || '你好';
  console.log(`📢 收到发音请求: ${text}`);

  if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
    console.error('❌ 环境变量未设置');
    return res.status(500).send('服务器未配置百度密钥，请在环境变量中设置 BAIDU_API_KEY, BAIDU_SECRET_KEY');
  }

  try {
    // 1. 将拼音转换为汉字（百度TTS接受汉字，发音更自然）
    const chineseText = pinyinToChinese(text);
    console.log(`📝 转换后的汉字文本: ${chineseText}`);

    // 2. 获取Access Token
    const accessToken = await getBaiduAccessToken();

    // 3. 构建请求参数（优化发音自然度）
    const params = new URLSearchParams();
    params.append('tex', chineseText);        // 合成文本（汉字）
    params.append('tok', accessToken);
    params.append('cuid', 'pinyin-app');
    params.append('ctp', '1');
    params.append('lan', 'zh');
    params.append('spd', '3');      // 语速 3（慢速清晰，范围0-15）
    params.append('pit', '6');      // 音调 6（略微升高，更明亮）
    params.append('vol', '8');      // 音量 8（饱满，范围0-15）
    params.append('per', '5');      // 发音人：5 童声（最适合儿童）
    params.append('aue', '6');      // 音频格式：6 = WAV

    console.log('📝 百度TTS请求参数:', params.toString());

    // 4. 发送请求
    const response = await axios.post(BAIDU_TTS_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      responseType: 'arraybuffer',
    });

    // 5. 检查响应
    if (response.status === 200) {
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('audio') || response.data.byteLength > 0) {
        console.log(`✅ 合成完成，音频大小: ${response.data.byteLength} 字节`);
        res.set('Content-Type', 'audio/wav');
        res.send(response.data);
      } else {
        const errorText = Buffer.from(response.data).toString('utf-8');
        console.error('❌ 百度TTS返回错误:', errorText);
        res.status(500).send('百度TTS合成错误: ' + errorText);
      }
    } else {
      console.error('❌ 百度TTS请求失败:', response.status, response.statusText);
      res.status(response.status).send('百度TTS请求失败');
    }
  } catch (error) {
    console.error('❌ TTS处理错误:', error.message);
    if (error.response) {
      try {
        const errorText = Buffer.from(error.response.data).toString('utf-8');
        console.error('❌ 百度TTS错误详情:', errorText);
        res.status(500).send('百度TTS错误: ' + errorText);
      } catch (e) {
        res.status(500).send('百度TTS请求异常: ' + error.message);
      }
    } else {
      res.status(500).send('TTS服务异常: ' + error.message);
    }
  }
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
  console.log(`   - TTS接口: http://localhost:${port}/tts?text=你好`);
  console.log(`   - 测试路由: http://localhost:${port}/test`);
});
