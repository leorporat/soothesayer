from groq import Groq
import os
from dotenv import load_dotenv
import json
import base64

load_dotenv()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def get_text_from_image_front_camera(image_path):
    # Convert local image to base64
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    
    completion = client.chat.completions.create(
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

    print(completion.choices[0].message)
    return completion.choices[0].message

def get_text_from_image_back_camera(image_path):

    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

    completion = client.chat.completions.create(
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
    return completion.choices[0].message

def get_text_from_audio(filename):
    with open(filename, "rb") as file:
        # Create a transcription of the audio file
        transcription = client.audio.transcriptions.create(
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
        return transcription.text
    
print(get_text_from_image_front_camera("./test_files/leor.jpg"));
# print(get_text_from_audio("./test_files/yogurtpark.mp3"));


