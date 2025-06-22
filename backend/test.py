from SoothSayer import SoothSayer

from config import *

client = SoothSayer(groq_api_key=GROQ_API_KEY, midas_model_type='DPT_Large')

client.image_to_projection('backend/IMG_2185.jpg')