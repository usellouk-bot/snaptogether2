
/**
 * MomenPix — ImageCapture Mock
 * tests/mocks/imagecapture.mock.js
 *
 * Three injectable states for Playwright addInitScript():
 *   IC_UNDEFINED  — simulates iOS/Safari (typeof ImageCapture === 'undefined')
 *   IC_SUCCESS    — simulates Android Chrome (takePhoto returns a Blob)
 *   IC_FAILURE    — simulates Android Chrome where takePhoto rejects
 *
 * Usage in spec:
 *   const { IC_UNDEFINED, IC_SUCCESS, IC_FAILURE } = require('../mocks/imagecapture.mock');
 *   await page.addInitScript(IC_UNDEFINED);
 *
 * Each export is a plain function — safe for addInitScript serialization.
 */

/**
 * IC_UNDEFINED
 * Deletes window.ImageCapture before page JS runs.
 * takePhotoNow() will fall through to _captureFromCanvas().
 */
const IC_UNDEFINED = () => {
  delete window.ImageCapture;
};

/**
 * IC_SUCCESS
 * Replaces window.ImageCapture with a stub that:
 * - accepts a MediaStreamTrack (ignored)
 * - returns a small valid JPEG Blob from takePhoto()
 *
 * The Blob is 1x1 px transparent JPEG — enough to:
 * - trigger createImageBitmap()
 * - flow through _scaleForCanvas() → ctx.drawImage() → burnWatermark() → toDataURL()
 * - confirm the pipeline runs, NOT that the Blob reaches uploadPhoto directly
 */
const IC_SUCCESS = () => {
  // Minimal 1×1 white JPEG as base64 (valid Blob source)
  const b64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U'
    + 'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN'
    + 'DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy'
    + 'MjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUEB'
    + '/8QAIRAAAQMEAwEAAAAAAAAAAAAAAQIDBAAFERIhMUH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA'
    + '/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8Amn2za2t19L3OEiRJcQhCG4jT'
    + 'gKnEpCRlR8k/NAA//9k=';

  const byteString = atob(b64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  const fakeBlob = new Blob([ab], { type: 'image/jpeg' });

  window.ImageCapture = class FakeImageCapture {
    constructor(track) { this._track = track; }
    takePhoto() { return Promise.resolve(fakeBlob); }
  };
};

/**
 * IC_FAILURE
 * Replaces window.ImageCapture with a stub where takePhoto() rejects.
 * takePhotoNow() must silently fall back to _captureFromCanvas().
 * No crash. Upload must still complete.
 */
const IC_FAILURE = () => {
  window.ImageCapture = class FakeImageCaptureFailure {
    constructor(track) { this._track = track; }
    takePhoto() { return Promise.reject(new Error('FakeImageCapture: simulated hardware failure')); }
  };
};

module.exports = { IC_UNDEFINED, IC_SUCCESS, IC_FAILURE };
