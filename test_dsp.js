const fs = require('fs');

// We need to decode OGG or read the PCM data.
// Since we don't have native ogg decoder in standard node without libraries,
// let's check if ffmpeg or python with soundfile/scipy is available.
console.log('Testing python audio decoders...');
