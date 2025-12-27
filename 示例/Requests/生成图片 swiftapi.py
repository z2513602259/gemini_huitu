import requests
import base64

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
            "parts": [{"text": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"}]
        }],
        "generationConfig": {
            "imageConfig": {"aspectRatio": "16:9"}
        }
    }
)

print("⭐ 原始返回：", response.text)

# 提取并保存图片
try:
    img_base64 = response.json()["candidates"][0]["content"]["parts"][1]["inlineData"]["data"]
    with open("generated_image.png", "wb") as f:
        f.write(base64.b64decode(img_base64))
    print("✅ 图片已保存为 generated_image.png")
except Exception as e:
    print(f"❌ 出错: {e}")