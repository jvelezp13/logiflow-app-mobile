/**
 * Test Supabase Connection
 *
 * Simple script to test if the mobile app can reach Supabase.
 * Run with: node test-connection.js
 */

const http = require('http');

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://10.0.2.2:54321';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

console.log('\n🔗 PROBANDO CONEXIÓN A SUPABASE\n');
console.log('================================================');
console.log('URL:', SUPABASE_URL);
console.log('================================================\n');

// Parse URL
const url = new URL(SUPABASE_URL + '/rest/v1/');

const options = {
  hostname: url.hostname,
  port: url.port,
  path: url.pathname,
  method: 'GET',
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`
  },
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log('✅ CONEXIÓN EXITOSA');
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nRespuesta:', data.substring(0, 200) + '...');
    console.log('\n✅ Supabase está accesible desde este host\n');
  });
});

req.on('error', (error) => {
  console.error('❌ ERROR DE CONEXIÓN:', error.message);
  console.error('\n⚠️  Posibles causas:');
  console.error('   1. Supabase local no está corriendo');
  console.error('   2. El puerto 54321 no está accesible');
  console.error('   3. Problema de firewall o red');
  console.error('\n💡 Solución:');
  console.error('   - Verifica que Supabase esté corriendo: supabase status');
  console.error('   - Intenta cambiar la URL a localhost o 127.0.0.1\n');
});

req.on('timeout', () => {
  console.error('❌ TIMEOUT: La conexión tardó demasiado');
  req.destroy();
});

req.end();
