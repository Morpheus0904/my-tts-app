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

    if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
        return res.status(500).send('服务器未配置百度密钥');
    }

    try {
        const accessToken = await getBaiduAccessToken();

        const params = new URLSearchParams();
        params.append('tex', text);
        params.append('tok', accessToken);
        params.append('cuid', 'pinyin-app');
        params.append('ctp', '1');
        params.append('lan', 'zh');
        params.append('spd', '3');      // 慢速清晰
        params.append('pit', '6');      // 明亮
        params.append('vol', '8');      // 饱满
        params.append('per', '5');      // 童声
        params.append('aue', '6');      // WAV

        const response = await axios.post(BAIDU_TTS_URL, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            responseType: 'arraybuffer',
        });

        if (response.status === 200) {
            res.set('Content-Type', 'audio/wav');
            res.send(response.data);
        } else {
            res.status(response.status).send('百度TTS请求失败');
        }
    } catch (error) {
        console.error('❌ TTS错误:', error.message);
        res.status(500).send('TTS服务异常');
    }
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
