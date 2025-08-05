require('dotenv').config();
const AWS = require('aws-sdk');

console.log('🔧 Testing AWS Configuration');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

async function testAWS() {
  try {
    console.log('\n🧪 Testing S3 bucket access...');
    
    // Test 1: List buckets
    const buckets = await s3.listBuckets().promise();
    console.log('✅ Successfully connected to AWS S3');
    console.log('Available buckets:', buckets.Buckets.map(b => b.Name));
    
    // Test 2: Check if our bucket exists
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const bucketExists = buckets.Buckets.some(b => b.Name === bucketName);
    console.log(`Bucket "${bucketName}":`, bucketExists ? '✅ Exists' : '❌ Not found');
    
    if (bucketExists) {
      // Test 3: Get bucket location
      const location = await s3.getBucketLocation({ Bucket: bucketName }).promise();
      console.log('Bucket location:', location.LocationConstraint || 'us-east-1');
      
      // Test 4: List objects
      const objects = await s3.listObjectsV2({ Bucket: bucketName, MaxKeys: 5 }).promise();
      console.log('Objects in bucket:', objects.Contents?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ AWS Test failed:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'SignatureDoesNotMatch') {
      console.error('\n💡 Possible solutions:');
      console.error('1. Check AWS credentials are correct');
      console.error('2. Verify no extra spaces in .env file');
      console.error('3. Check if region matches bucket region');
      console.error('4. Verify AWS account permissions');
    }
  }
}

testAWS();