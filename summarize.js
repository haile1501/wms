const fs = require('fs');

// Specify the path to your JSON file
const filePath = './results.json';

// Read the JSON file
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  try {
    // Parse the JSON data into a JavaScript object
    const jsonArray = JSON.parse(data);
    let totalTime = 0;
    for (let i = 0; i < jsonArray.length; i++) {
      totalTime += jsonArray[i].pickingTime * 60;
    }

    console.log(totalTime / jsonArray.length);
    // Now jsonArray contains your array from the JSON file
  } catch (jsonError) {
    console.error('Error parsing JSON:', jsonError);
  }
});
