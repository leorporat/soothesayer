from groq import Groq

import cv2, torch, base64
import numpy as np

# Remove unused matplotlib imports to prevent GUI issues
# import matplotlib.pyplot as plt
# from mpl_toolkits.mplot3d import Axes3D
import speech_recognition as sr
import logging

# Remove vedo import since we're not using GUI visualization
# from vedo import Points, show

# Configure SoothSayer logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")

class SoothSayer:
    # model_type = "DPT_Large"     # MiDaS v3 - Large     (highest accuracy, slowest inference speed)
    # model_type = "DPT_Hybrid"   # MiDaS v3 - Hybrid    (medium accuracy, medium inference speed)
    # model_type = "MiDaS_small"  # MiDaS v2.1 - Small   (lowest accuracy, highest inference speed)
    def __init__(self, groq_api_key: str, midas_model_type: str):
        logger.info(f"🤖 [SOOTHSAYER] Initializing SoothSayer with model: {midas_model_type}")
        self.client     = Groq(api_key=groq_api_key)
        self.recognizer = sr.Recognizer()

        # MiDaS initialization
        logger.info(f"🤖 [SOOTHSAYER] Loading MiDaS model: {midas_model_type}")
        self.midas = torch.hub.load("intel-isl/MiDaS", midas_model_type)
        self.midas.to(device)
        self.midas.eval()

        midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
        if midas_model_type == "DPT_Large" or midas_model_type == "DPT_Hybrid":
            self.transform = midas_transforms.dpt_transform
        else:
            self.transform = midas_transforms.small_transform
        
        logger.info(f"🤖 [SOOTHSAYER] ✅ Initialization complete")

    def input_to_audio(self, image_front, image_back, audio) -> str:
        logger.info(f"🤖 [SOOTHSAYER] Starting comprehensive analysis")
        logger.info(f"🤖 [SOOTHSAYER] Input files: face={image_front}, env={image_back}, audio={audio}")
        
        logger.info(f"🤖 [SOOTHSAYER] Step 1/4: Analyzing facial sentiment...")
        facial_sentiment       = self.get_text_from_image_front_camera(image_front)
        
        logger.info(f"🤖 [SOOTHSAYER] Step 2/4: Analyzing environment...")
        sight_characterization = self.get_text_from_image_back_camera(image_back)
        
        logger.info(f"🤖 [SOOTHSAYER] Step 3/4: Transcribing audio...")
        audio_transcript       = self.get_text_from_audio(audio)

        # Temporarily remove optimal movement angle calculation to fix the error
        # logger.info(f"🤖 [SOOTHSAYER] Step 4/4: Calculating optimal movement angle...")
        # optimal_angle_of_movement = self.image_to_projection(image_back)
        optimal_angle_of_movement = 90  # Default to center (90 degrees)

        prompt = f"Facial Sentiment:\n{facial_sentiment}\n\nObject In Front of User:\n{sight_characterization}\n\nUser speech:\n{audio_transcript}\n\nOptimal angle of unobstructed movement from 0-180º where 0 is straight left and 180 is straight right:\n{optimal_angle_of_movement}.\n\nPlease keep it conversational and under 20 words."
        
        logger.info(f"🤖 [SOOTHSAYER] Generating final analysis response...")
        chat_completion = self.client.chat.completions.create(
            messages=[
                # Set an optional system message. This sets the behavior of the
                # assistant and can be used to provide specific instructions for
                # how it should behave throughout the conversation.
                {
                    "role": "system",
                    "content": "You are a helpful assistant that analyzes combined sentiment data from facial expressions, environment, and audio transcription. Provide insights and recommendations based on this data."
                },
                # Set a user message for the assistant to respond to.
                {
                    "role": "user",
                    "content": prompt,
                }
                ],

                    # The language model which will generate the completion.
            model="llama-3.3-70b-versatile"
        )

        result = chat_completion.choices[0].message.content
        logger.info(f"🤖 [SOOTHSAYER] ✅ Analysis complete: '{result}'")
        return result

    
    def image_to_projection(self,image):
        try:
            #img = cv2.imdecode(np.array(image))
            img = cv2.imread(image)
            if img is None:
                logger.warning(f"🤖 [SOOTHSAYER] Could not read image: {image}")
                return 90  # Default to center
            
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
            
            # Remove GUI visualization - just process the data without displaying
            # pts = Points(xyz, r=4)  # r is point radius
            # pts.cmap("viridis", xyz[:, 1])  # color by y-values (you can change this)
            # show(pts, axes=1, bg='white', title='3D Point Cloud')

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

            # Add error handling for when no valid slices are found
            if best_slice is None:
                logger.warning(f"🤖 [SOOTHSAYER] No valid movement angles found in image: {image}")
                return 90  # Default to center (90 degrees)

            optimal_direction = np.mean(best_slice)
            logger.info(f"🤖 [SOOTHSAYER] Calculated optimal direction: {optimal_direction} degrees")
            return optimal_direction
            
        except Exception as e:
            logger.error(f"🤖 [SOOTHSAYER] Error in image_to_projection: {str(e)}")
            return 90  # Default to center (90 degrees) on error
                        
    def get_text_from_image_front_camera(self, image_path):
        logger.info(f"🤖 [SOOTHSAYER-FACE] Analyzing facial sentiment from: {image_path}")
        
        # Convert local image to base64
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        
        logger.info(f"🤖 [SOOTHSAYER-FACE] Image encoded, calling GROQ vision model...")
        completion = self.client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """You are an expert at analyzing human emotions from visual cues. Your task is to identify the emotional state of a person based on their facial expressions, body language, and overall appearance.

                                    ## Instructions

                                    Analyze the provided image or description and identify the person's emotional state. Consider these visual indicators:

                                    **Facial Expression Cues:**
                                    - Eyes: openness, tension, gaze direction, eyebrow position
                                    - Mouth: shape, tension, corners (up/down/neutral)
                                    - Forehead: wrinkles, furrows, smoothness
                                    - Overall facial muscle tension or relaxation

                                    **Body Language Indicators:**
                                    - Posture: upright, slouched, tense, relaxed
                                    - Shoulder position: raised, dropped, forward, back
                                    - Hand gestures and positioning
                                    - Overall body tension or openness

                                    **Contextual Visual Cues:**
                                    - Energy level apparent in the image
                                    - Apparent comfort or discomfort
                                    - Social engagement indicators

                                    ## Output Format

                                    Provide your analysis in this structured format:

                                    **Primary Emotion:** [Single most prominent emotion]
                                    **Confidence Level:** [High/Medium/Low]
                                    **Secondary Emotions:** [Additional emotions if present]
                                    **Key Visual Indicators:** [Specific features that led to this assessment]

                                    ## Emotion Categories

                                    Consider these emotional states (but don't limit yourself to only these):

                                    **Positive Emotions:** Happy, joyful, excited, confident, calm, peaceful, content, amused, surprised (positive), proud, grateful, loving, enthusiastic

                                    **Negative Emotions:** Sad, anxious, nervous, worried, frustrated, angry, disappointed, scared, disgusted, ashamed, guilty, embarrassed, lonely, overwhelmed

                                    **Neutral/Mixed Emotions:** Neutral, contemplative, focused, curious, tired, bored, confused, skeptical, determined, serious

                                    ## Guidelines

                                    - Be specific rather than generic (e.g., "anxiously excited" rather than just "excited")
                                    - Note when emotions appear mixed or conflicted
                                    - Distinguish between temporary expressions and apparent underlying emotional states
                                    - Consider cultural context when relevant
                                    - If the emotional state is unclear, indicate uncertainty and explain why
                                    - Avoid making assumptions about causes of emotions, focus only on what's visually apparent

                                    ## Example Response

                                    **Primary Emotion:** Nervously excited
                                    **Confidence Level:** High
                                    **Secondary Emotions:** Slight apprehension, anticipation
                                    **Key Visual Indicators:** Bright eyes with slight tension around them, genuine smile with slightly raised eyebrows, upright but slightly tense posture, hands clasped together"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{encoded_string}"
                            }
                        }
                    ]
                }
            ],
            temperature=1,
            max_completion_tokens=1024,
            top_p=1,
            stream=False,
            stop=None,
        )

        result = completion.choices[0].message
        logger.info(f"🤖 [SOOTHSAYER-FACE] ✅ Facial analysis complete")
        return result

    def get_text_from_image_back_camera(self, image_path):
        logger.info(f"🤖 [SOOTHSAYER-ENV] Analyzing environment from: {image_path}")
        
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

        logger.info(f"🤖 [SOOTHSAYER-ENV] Image encoded, calling GROQ vision model...")
        completion = self.client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "What's in this image?"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{encoded_string}" # CHANGE IMAGE FILE HERE, this would be image from camera
                            }
                        }
                    ]
                }
            ],
            temperature=1,
            max_completion_tokens=1024,
            top_p=1,
            stream=False,
            stop=None,
        )

        print(completion.choices[0].message)
        result = completion.choices[0].message
        logger.info(f"🤖 [SOOTHSAYER-ENV] ✅ Environment analysis complete")
        return result

    def get_text_from_audio(self, filename):
        logger.info(f"🤖 [SOOTHSAYER-AUDIO] Transcribing audio from: {filename}")
        
        with open(filename, "rb") as file:
            logger.info(f"🤖 [SOOTHSAYER-AUDIO] Calling GROQ Whisper for transcription...")
            # Create a transcription of the audio file
            transcription = self.client.audio.transcriptions.create(
            file=file, # Required audio file
            model="whisper-large-v3-turbo", # Required model to use for transcription
            prompt="Specify context or spelling",  # Optional
            response_format="verbose_json",  # Optional
            timestamp_granularities = ["word", "segment"], # Optional (must set response_format to "json" to use and can specify "word", "segment" (default), or both)
            language="en",  # Optional
            temperature=0.0  # Optional
            )
            # To print only the transcription text, you'd use print(transcription.text) (here we're printing the entire transcription object to access timestamps)
            # print(json.dumps(transcription, indent=2, default=str))
            
            logger.info(f"🤖 [SOOTHSAYER-AUDIO] ✅ Transcription complete: '{transcription.text}'")
            return transcription.text