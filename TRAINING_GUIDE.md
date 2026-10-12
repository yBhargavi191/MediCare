# Training Your Custom Pill-Recognition AI

MediCare supports a **custom Teachable Machine model** that recognizes real
medicine packaging — **tablets AND tonics** — instead of the generic COCO-SSD
`bottle` detector. Your trained model is already wired in; this guide explains
how it works and how to retrain/improve it later.

## How verification works (anti-cheat pipeline)

Verification is a 3-step sequence. All three must pass:

| Step | What the AI checks | Cheat it blocks |
|---|---|---|
| 1 · SHOW | Medicine (tablet strip / tonic bottle) is detected in frame | Random objects |
| 2 · TAKE | MoveNet pose AI sees a hand move to the mouth | Just holding the pill up forever |
| 3 · CONFIRM | Medicine leaves the camera frame | Showing the same pill repeatedly without taking it |

The dose record saves `verifiedVia: "ingestion-sequence"` so admins can see
full ingestion was confirmed, not just a glimpse of the pack.

## Current model

- URL: `https://teachablemachine.withgoogle.com/models/15sHnR-vS/`
- Classes: `Tablets`, `syrup`, `other objects`, `human`
- Accepted for verification: `Tablets`, `syrup`

## Improving accuracy (retrain anytime)

If detection feels unreliable:

1. Open your model at https://teachablemachine.withgoogle.com/train/image
   (or start a new project).
2. Add MORE photos to the weak classes, captured in the **same lighting and
   background you test in**:
   - `Tablets` — more angles, distances, hands holding the strip
   - `syrup` — same variety
   - `other objects` — cups, phones, food, empty rooms
   - `human` — face close-ups and empty hands (prevents false verifies)
3. Re-train → Export → Tensorflow.js → Upload → copy the new link.
4. Paste the new link into `CUSTOM_MODEL.url` in `js/firebase-config.js`.

## Self-hosting the model (optional, works offline)

1. Export → Tensorflow.js → **Download** → unzip (you get `model.json`,
   `metadata.json`, `weights.bin`).
2. Put all three files into `models/pill-model/`.
3. Set `url: 'models/pill-model/'` in `js/firebase-config.js`.

> The folder must be served over HTTP (`python -m http.server`), which you
> already need for camera access anyway.

## Tuning

| Setting | Where | Effect |
|---|---|---|
| `confidenceThreshold` | `js/firebase-config.js` | Raise (0.75–0.9) if wrong objects verify; lower (0.5) if real medicine isn't detected |
| `acceptedClasses` | `js/firebase-config.js` | Which trained class names count as valid verification |
| `REQUIRE_HAND_TO_MOUTH` | `js/firebase-config.js` | `false` = old show-only check (use only if pose AI fails on your device) |
| `HAND_TO_MOUTH_FRAMES` | `js/firebase-config.js` | Higher = stricter gesture detection |
| `MEDICINE_GONE_FRAMES` | `js/firebase-config.js` | How long the medicine must stay out of frame |
| `WRIST_SCORE_MIN` | `js/firebase-config.js` | Pose confidence needed for wrist keypoints |

## Fallback safety

- If the custom model URL fails to load (e.g. no internet), verification
  falls back to COCO-SSD bottle detection.
- If the pose model fails to load, verification falls back to show-only mode
  (steps indicator hides automatically) so a live demo never breaks.
