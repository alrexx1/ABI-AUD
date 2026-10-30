const fs = require('fs');

async function checkDetails() {
  const url = 'https://hexaov91.github.io/abi-assets/data/items/details.json';
  console.log('Fetching', url);
  try {
    const resp = await fetch(url);
    console.log('Status:', resp.status);
    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      console.log('Byte length:', buf.byteLength);
    }
  } catch (e) {
    console.error(e);
  }
}

checkDetails();
