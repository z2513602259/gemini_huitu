import requests
import base64

# 读取图片并编码
with open("111.png", "rb") as f:
    img_base64 = base64.b64encode(f.read()).decode("utf-8")

# 请求 API
response = requests.post(
    # base_url对应填写你的中转接口，替换api.example.com部分
    "https://api.example.com/v1beta/models/gemini-2.5-flash-image-c:generateContent",
    headers={
        'x-goog-api-key': 'sk-xxx',
        'Content-Type': 'application/json'
    },
    json={
        "contents": [{
            "parts": [
                {"text": "Add a cat in this pic"},
                {"inline_data": {"mime_type": "image/png", "data": img_base64}}
            ]
        }]
    }
)

# 提取返回的 base64 并保存
result_base64 = response.json()["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
with open("output.png", "wb") as f:
    f.write(base64.b64decode(result_base64))

print("✅ 图片已保存为 output.png")