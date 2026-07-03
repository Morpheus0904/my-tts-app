const express = require('express');
const path = require('path');
const axios = require('axios'); // 用于发送HTTP请求
const crypto = require('crypto'); // 用于生成签名

const app = express();
const port = process.env.PORT || 3000;

// ================================================================
// 从环境变量读取百度智能云密钥
// ================================================================
const BAIDU_API_KEY = process.env.BAIDU_API_KEY;
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY;

// 百度TTS API地址
const BAIDU_TTS_URL = 'https://tsn.baidu.com/text2audio';

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

    // 检查密钥是否配置
    if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
        console.error('❌ 环境变量未设置');
        return res.status(500).send('服务器未配置百度密钥，请在环境变量中设置 BAIDU_API_KEY, BAIDU_SECRET_KEY');
    }

    try {
        // 1. 获取Access Token
        const accessToken = await getBaiduAccessToken();

        // 2. 构建请求参数
        const params = new URLSearchParams();
        params.append('tex', text);           // 待合成的文本
        params.append('tok', accessToken);    // 访问令牌
        params.append('cuid', 'pinyin-app');  // 用户标识，可自定义
        params.append('ctp', '1');            // 客户端类型，web端固定为1[reference:8]
        params.append('lan', 'zh');           // 语言，固定为zh[reference:9]
        params.append('spd', '4');            // 语速，0-15，默认5，调低一些更清晰[reference:10][reference:11]
        params.append('pit', '5');            // 音调，0-15，默认5[reference:12][reference:13]
        params.append('vol', '5');            // 音量，0-9或0-15，默认5[reference:14][reference:15]
        params.append('per', '0');            // 发音人，0为标准女声[reference:16]
        params.append('aue', '6');            // 音频格式，6为wav[reference:17]

        console.log('📝 百度TTS请求参数:', params.toString());

        // 3. 发送POST请求到百度TTS API[reference:18]
        const response = await axios.post(BAIDU_TTS_URL, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            responseType: 'arraybuffer', // 重要：接收二进制音频数据
        });

        // 4. 检查响应
        if (response.status === 200) {
            // 检查返回的是否是音频数据（通过Content-Type判断）
            const contentType = response.headers['content-type'] || '';
            if (contentType.includes('audio') || response.data.byteLength > 0) {
                console.log(`✅ 合成完成，音频大小: ${response.data.byteLength} 字节`);
                // 直接返回音频数据，浏览器会识别并播放
                res.set('Content-Type', 'audio/wav');
                res.send(response.data);
            } else {
                // 如果返回的是错误信息（JSON格式）
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
            // 尝试解析错误响应
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
