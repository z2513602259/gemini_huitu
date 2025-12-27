# pip install --upgrade google-genai

from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

# 创建客户端
client = genai.Client(
    api_key='sk-xxx',
    http_options=types.HttpOptions(
        # base_url对应填写你的中转接口
        base_url='https://api.example.com'
    )
)

prompt = (
    "Add a cat in this picture"
)

image = Image.open("111.png")

response = client.models.generate_content(
    model="gemini-3-pro-image-preview-bs",
    contents=[prompt, image],
    # config=generation_config,  # 添加这行配置
    config=types.GenerateContentConfig(
        image_config=types.ImageConfig(
            aspect_ratio="16:9",
            image_size="2K",
        )
    )
)

for part in response.candidates[0].content.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = Image.open(BytesIO(part.inline_data.data))
        image.save("generated_image.png")