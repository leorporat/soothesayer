from SoothSayer import SoothSayer
import os

client = SoothSayer(groq_api_key='KEY', midas_model_type='DPT_Large')

client.get_speech_from_text("Hello world!")
