// ===================================================================
// MediCare — Medicine reference-photo matcher (one-shot learning)
// ===================================================================
// The admin enrols ONE photo per medicine (the strip / box / bottle, with
// the name printed). The photo is turned into a MobileNet feature vector
// ("embedding") and stored on the medicine document. At verify time the live
// camera frame is turned into an embedding too and compared using cosine
// similarity — proving the patient is holding the RIGHT medicine, not just
// any tablet.
//
// Requires @tensorflow/tfjs and @tensorflow-models/mobilenet to be loaded.
// ===================================================================

let _medicineMatcher = null;
let _matcherPromise = null;

async function loadMedicineMatcher() {
  if (_medicineMatcher) return _medicineMatcher;
  if (_matcherPromise) return _matcherPromise;
  if (typeof mobilenet === 'undefined') throw new Error('MobileNet is not available on this device.');
  _matcherPromise = mobilenet.load({ version: 2, alpha: 0.5 })
    .then(model => { _medicineMatcher = model; return model; })
    .catch(err => { _matcherPromise = null; throw err; });
  return _matcherPromise;
}

function medicineMatcherReady() { return Boolean(_medicineMatcher); }

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
    img.src = url;
  });
}

async function imageToEmbedding(source) {
  const model = await loadMedicineMatcher();
  const tensor = model.infer(source, true); // true = return the embedding vector
  const values = Array.from(await tensor.data());
  if (tensor && tensor.dispose) tensor.dispose();
  return values;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function medicineThumbnail(img, max = 220) {
  const src = img.naturalWidth || img.width;
  const scale = Math.min(1, max / Math.max(src, img.naturalHeight || img.height));
  const w = Math.max(1, Math.round(src * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.6);
}

async function buildMedicineReference(file) {
  const img = await fileToImage(file);
  const embedding = await imageToEmbedding(img);
  const photo = medicineThumbnail(img);
  return { embedding, photo };
}
