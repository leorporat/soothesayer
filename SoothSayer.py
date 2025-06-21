import cv2
import torch

import matplotlib.pyplot as plt

import speech_recognition as sr

from groq import Groq

device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")

class SoothSayer:
    def __init__(self, midas_model_type: str):
        self.client     = Groq()
        self.recognizer = sr.Recognizer()

        # MiDaS initialization
        self.midas = torch.hub.load("intel-isl/MiDaS", midas_model_type)

    def input_to_audio(self, image_front, image_back, audio) -> None:
        speech = self.recognizer.listen(audio)
        
        completion = self.client.chat.completions.create(
            model="meta-llama/llama-4-maverick-17b-128e-instruct",
            messages=[
            {
                "role": "system",
                "content": "aaaaa"
            },
            {
                "role": "user",
                "content": [
                {
                    "type": "text",
                    "text": "analyze this briefly"
                },
                {
                    "type": "image_url",
                    "image_url": {
                    "url": f"data:image/jpeg;base64,{image_back}"
                    }
                }
                ]
            }
            ],
            temperature=1,
            max_completion_tokens=1024,
            top_p=1,
            stream=True,
            stop=None,
        )

        for chunk in completion:
            print(chunk.choices[0].delta.content or "", end="")
