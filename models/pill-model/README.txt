# Put your Teachable Machine model files here

Export from https://teachablemachine.withgoogle.com/train/image
(Tensorflow.js -> Download) and place these three files in this folder:

- model.json
- metadata.json
- weights.bin

Then set in js/firebase-config.js:

    const CUSTOM_MODEL = { url: 'models/pill-model/', ... };

See TRAINING_GUIDE.md in the project root for full instructions.
