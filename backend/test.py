from SoothSayer import SoothSayer
import os

client = SoothSayer(groq_api_key='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', midas_model_type='DPT_Large')

client.get_speech_from_text("Hello world!")