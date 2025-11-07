================================================================================
       PPG ARRHYTHMIA DETECTION - CAIRE HACKATHON STARTER NOTEBOOK
================================================================================

OVERVIEW
--------
This notebook helps you build a machine learning model for cardiac arrhythmia 
detection. You'll train a classifier to distinguish between healthy and 
arrhythmic heart rhythms using our curated PPG dataset.

What happens next? Once trained, you'll deploy this model on rPPG signals 
extracted from driver videos using the CAIRE Cloud API — testing whether a 
model trained on clean sensor data can work in real-world driving scenarios.


YOUR MISSION
------------

Step 1: Train on PPG Data (This Notebook)
- Work with medical-grade PPG (Photoplethysmography) signals from contact sensors
- Build and train a binary classifier: Healthy vs. Arrhythmic rhythms
- Evaluate model performance on our test set
- Export your trained model for deployment

Step 2: Deploy on rPPG Signals (Next Challenge)
- Use the CAIRE Cloud API to extract rPPG signals from driver videos
- Apply your PPG-trained model to these camera-based physiological signals
- Evaluate real-world performance and generalization


UNDERSTANDING THE SIGNAL TYPES
-------------------------------

PPG (Photoplethysmography) - What You're Training On
- Source: Contact-based sensors (e.g., fingertip pulse oximeter, wearable devices)
- Quality: High signal-to-noise ratio, medical-grade accuracy
- Stability: Minimal motion artifacts, controlled measurement conditions
- Use Case: Perfect for learning cardiac rhythm patterns

rPPG (Remote Photoplethysmography) - Your Deployment Target
- Source: Camera-based extraction from facial video (measures subtle skin color changes)
- Context: Real-time driver monitoring in vehicles
- Challenges: Lower signal quality, environmental variations, movement during driving
- Use Case: Non-contact health monitoring for automotive safety

Why This Matters: PPG datasets exist for arrhythmia detection, but rPPG 
arrhythmia datasets don't. Your challenge is to bridge this gap by training 
on PPG and deploying on rPPG signals retrieved from our API.


DATASET SPECIFICATIONS
----------------------
                    Training    Test        Total
Samples:            35,120      11,707      46,827
Duration:           97.6 hrs    32.5 hrs    130.1 hrs
Segment Length:     10 seconds @ 100 Hz (1,000 samples per segment)
Class Distribution: Healthy: 31.2% / Arrhythmic: 68.8%

Signal Characteristics:
- Sampling rate: 100 Hz
- Segment duration: 10 seconds per sample
- Data format: NumPy arrays (.npy)
- Labels: 0 = Healthy, 1 = Arrhythmic


FOLDER CONTENTS
---------------
ppg_arrhythmia_notebook/
├── CAIRE_Arrhythmia_Detection_Starter.ipynb
├── data/
│   ├── train/
│   │   ├── train_segments.npy  (35,120 × 1,000)
│   │   └── train_labels.npy    (35,120 labels)
│   └── test/
│       ├── test_segments.npy   (11,707 × 1,000)
│       └── test_labels.npy     (11,707 labels)
└── README.txt

GETTING STARTED
---------------

Quick Start:
1. Open the notebook "CAIRE_Arrhythmia_Detection_Starter.ipynb" in Google Colab
3. Run the exploration cells to visualize healthy vs. arrhythmic signals
4. Build your classifier using your preferred ML approach
5. Evaluate and export your trained model for deployment


WHAT YOU'LL LEARN
-----------------
By completing this notebook, you will:
✓ Understand cardiac signal characteristics and arrhythmia patterns
✓ Implement time-series classification for physiological data
✓ Handle class imbalance in medical datasets
✓ Prepare models for real-world deployment scenarios
✓ Build machine learning solutions for safety-critical applications


SUCCESS CRITERIA
----------------
Your trained model should:
- Accurately classify PPG test segments 
- Process efficiently 10-second segments for real-time compatibility
- Be exportable in a format compatible with deployment



NEXT STEPS: CAIRE API INTEGRATION
----------------------------------
After training your model here, you'll:
1. Access the CAIRE Cloud API to retrieve rPPG signals from driver videos
2. Preprocess rPPG data to match your training format (10-second segments @ 100 Hz)
3. Apply your trained model to predict arrhythmia on real-world driving data
4. Analyze performance and document challenges in domain adaptation

Details on API integration and rPPG deployment will be provided in the next phase.


WHAT IS ARRHYTHMIA?
-------------------
Arrhythmia refers to any irregular heart rhythm that deviates from normal 
cardiac function.

Normal Rhythm (Sinus Rhythm): Regular, periodic heartbeats with consistent intervals

Arrhythmic Rhythm: Irregular patterns including:
- Premature beats (occurring too early)
- Skipped beats (missing expected pulses)
- Tachycardia (abnormally fast heart rate)
- Bradycardia (abnormally slow heart rate)
- Chaotic timing (unpredictable intervals)

Why It Matters for Driving: Severe arrhythmias can cause dizziness, fainting, 
or impaired motor control — making real-time detection critical for road safety.


SUPPORT
-------
Need help during the hackathon?
- Check the notebook's markdown cells for detailed guidance
- Reach out to the CAIRE team for technical questions


Good luck building your cardiac event detector! 🚗💓

--------------------------------------------------------------------------------
CAIRE Hackathon 2025
================================================================================