from groq import Groq

import cv2, torch
import numpy as np

import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import speech_recognition as sr

from vedo import Points, show

device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")

class SoothSayer:
    # model_type = "DPT_Large"     # MiDaS v3 - Large     (highest accuracy, slowest inference speed)
    # model_type = "DPT_Hybrid"   # MiDaS v3 - Hybrid    (medium accuracy, medium inference speed)
    # model_type = "MiDaS_small"  # MiDaS v2.1 - Small   (lowest accuracy, highest inference speed)
    def __init__(self, groq_api_key: str, midas_model_type: str):
        self.client     = Groq(api_key=groq_api_key)
        self.recognizer = sr.Recognizer()

        # MiDaS initialization
        self.midas = torch.hub.load("intel-isl/MiDaS", midas_model_type)
        self.midas.to(device)
        self.midas.eval()

        midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
        if midas_model_type == "DPT_Large" or midas_model_type == "DPT_Hybrid":
            self.transform = midas_transforms.dpt_transform
        else:
            self.transform = midas_transforms.small_transform

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
    
    def image_to_projection(self,image):
        #img = cv2.imdecode(np.array(image))
        img = cv2.imread(image)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        input_batch = self.transform(img).to(device)

        with torch.no_grad():
            prediction = self.midas(input_batch)

            prediction = torch.nn.functional.interpolate(
                prediction.unsqueeze(1),
                size=img.shape[:2],
                mode="bicubic",
                align_corners=False,
            ).squeeze()

        output = prediction.cpu().numpy()

        h, w = output.shape

        x = np.flip(np.tile(np.arange(w), h)/40)
        x = x - x.mean()
        y = -np.flip(output.flatten()) + 38
        #y = np.flip(output.flatten())
        z = np.repeat(np.arange(h), w)/40

        xyz = np.stack((x, y, z), axis=1)

        y = xyz[:, 1]
        
        pts = Points(xyz, r=4)  # r is point radius
        pts.cmap("viridis", xyz[:, 1])  # color by y-values (you can change this)
        show(pts, axes=1, bg='white', title='3D Point Cloud')

        # Get x and y components
        xy = xyz[:, :2]  # shape (N, 2)
        angles_xy = np.arctan2(xy[:,1], xy[:,0])  # in radians
        angles_xy = np.degrees(angles_xy) % 360  # convert to [0, 360)

        # We'll check from 0 to 180 in 10° slices
        slices = [(i, i+10) for i in range(0, 180, 10)]
        
        max_distance = float(0)
        best_slice = None

        for low, high in slices:
            # Filter points whose (x, y) angle falls in the slice
            in_slice = (angles_xy >= low) & (angles_xy < high)
            selected = xyz[in_slice]

            if selected.shape[0] == 0:
                continue  # no points in this slice

            # Direction vector = midpoint of the slice
            theta = np.radians((low + high) / 2)
            dir_xy = np.array([np.cos(theta), np.sin(theta), 0.0])
            dir_z  = np.array([0.0, 0.0, 1.0])

            # Create basis: [XY direction, Z axis]
            basis = np.stack([dir_xy, dir_z], axis=1)  # shape (3, 2)
            P = basis @ np.linalg.inv(basis.T @ basis) @ basis.T

            projections = selected @ P.T
            distance = np.sum(np.sum(projections**2, axis=1))

            if distance > max_distance:
                max_distance = distance
                best_slice = (low, high)

        optimal_direction = np.mean(best_slice)
        
        return optimal_direction
                        
