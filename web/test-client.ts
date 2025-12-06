import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/deepinsight/conference_question',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

let lineCount = 0;
let dataSize = 0;

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);

  res.on('data', (chunk) => {
    lineCount += (chunk.toString().match(/\n\n/g) || []).length;
    dataSize += chunk.length;
    console.log(
      `Received ${chunk.length} bytes (Total lines: ~${lineCount}, Total: ${dataSize} bytes)`,
    );
  });

  res.on('end', () => {
    console.log(`Response ended. Total lines received: ${lineCount}`);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  process.exit(1);
});

// Write data
req.write(JSON.stringify({}));
req.end();

// Keep connection alive for 30 seconds
setTimeout(() => {
  console.log('Timeout reached, exiting...');
  process.exit(0);
}, 30000);
