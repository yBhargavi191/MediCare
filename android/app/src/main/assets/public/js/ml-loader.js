/* Lazily loads the heavy in-browser ML libraries only when they are actually
   needed (opening the verify camera / scanning a label). Keeping them out of
   the initial HTML makes every page paint immediately and work offline. */
(function () {
  // Resolved scripts and in-flight loads. These MUST be declared before
  // loadScript() runs: `pending` was previously undeclared, so the first read
  // of `pending[src]` threw "pending is not defined" and silently broke every
  // lazy ML feature (camera verification, medicine matching, label OCR).
  var loaded = {};
  var pending = {};
  function loadScript(src) {
    if (loaded[src]) return Promise.resolve();
    if (pending[src]) return pending[src];
    pending[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () { loaded[src] = true; resolve(); };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
    return pending[src];
  }
  var V = 'js/vendor/';

  let verifyPromise = null;
  function loadVerifyLibs() {
    if (verifyPromise) return verifyPromise;
    verifyPromise = loadScript(V + 'tf.min.js')
      .then(function () { return loadScript(V + 'teachablemachine-image.min.js'); })
      .then(function () { return loadScript(V + 'mobilenet.min.js'); })
      .then(function () { return loadScript(V + 'pose-detection.min.js'); });
    return verifyPromise;
  }

  var cocoPromise = null;
  function loadCocoSsd() {
    if (cocoPromise) return cocoPromise;
    cocoPromise = loadScript('js/vendor/coco-ssd.min.js');
    return cocoPromise;
  }

  var matchPromise = null;
  function loadMatchLibs() {
    if (matchPromise) return matchPromise;
    matchPromise = loadScript('js/vendor/tf.min.js')
      .then(function () { return loadScript('js/vendor/mobilenet.min.js'); });
    return matchPromise;
  }

  var ocrPromise = null;
  function loadOcrLibs() {
    if (ocrPromise) return ocrPromise;
    ocrPromise = loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    return ocrPromise;
  }

  window.MediCareML = {
    loadScript: loadScript,
    loadVerifyLibs: loadVerifyLibs,
    loadCocoSsd: loadCocoSsd,
    loadMatchLibs: loadMatchLibs,
    loadOcrLibs: loadOcrLibs,
    loadConfetti: function () { return loadScript('js/vendor/confetti.browser.min.js'); }
  };
})();
