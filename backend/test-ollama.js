/**
 * Quick test script to verify Ollama connection
 * Run with: node test-ollama.js
 */

const endpoint = 'http://100.124.93.99:11434/v1/models';

console.log('🧪 Testing Ollama connection...');
console.log(`   Endpoint: ${endpoint}\n`);

fetch(endpoint, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
})
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('✅ Connection successful!\n');
    console.log('Available models:');
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(model => {
        console.log(`  - ${model.id}`);
      });
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
    console.log('\n🎉 Ollama is reachable! You can start the backend now.\n');
  })
  .catch(error => {
    console.error('❌ Connection failed!');
    console.error(`   Error: ${error.message}\n`);

    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Troubleshooting:');
      console.log('   1. Check Tailscale is running on both machines');
      console.log('   2. Verify Ollama is running: docker ps | grep ollama');
      console.log('   3. Try pinging: ping 100.124.93.99');
      console.log('   4. Check firewall settings on remote PC\n');
    } else if (error.message.includes('timeout')) {
      console.log('💡 The connection is timing out.');
      console.log('   This might be a network or firewall issue.\n');
    }
  });
