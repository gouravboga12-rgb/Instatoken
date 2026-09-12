const { uploadFile } = require('../config/s3');

async function test() {
  try {
    const url = await uploadFile('test/hello.txt', Buffer.from('hello world'), 'text/plain');
    console.log('S3 Upload Successful! URL:', url);
  } catch (err) {
    console.error('S3 Upload Error:', err);
  } finally {
    process.exit(0);
  }
}

test();
