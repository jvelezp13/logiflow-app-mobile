/**
 * Debug script para verificar variables de entorno
 * Ejecutar: npm run debug:env
 */

require('dotenv').config();

console.log('\n🔍 VERIFICACIÓN DE VARIABLES DE ENTORNO (Expo SDK 49+)\n');
console.log('================================================');
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL || '❌ NO CONFIGURADO');
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurado (' + process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.substring(0, 30) + '...)' : '❌ NO CONFIGURADO');
console.log('EXPO_PUBLIC_APP_NAME:', process.env.EXPO_PUBLIC_APP_NAME || '❌ NO CONFIGURADO');
console.log('EXPO_PUBLIC_APP_VERSION:', process.env.EXPO_PUBLIC_APP_VERSION || '❌ NO CONFIGURADO');
console.log('EXPO_PUBLIC_ENV:', process.env.EXPO_PUBLIC_ENV || '❌ NO CONFIGURADO');
console.log('================================================\n');

// Verificar que la URL es accesible
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (url) {
  if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('10.0.2.2') || url.includes(':54321')) {
    console.log('✅ Configurado para Supabase LOCAL');
    if (url.includes('10.0.2.2')) {
      console.log('   📱 Android Emulator mode');
    } else if (url.includes('localhost') || url.includes('127.0.0.1')) {
      console.log('   📱 iOS Simulator mode');
    }
  } else {
    console.log('⚠️  Configurado para Supabase PRODUCCIÓN');
  }
}

console.log('\n💡 IMPORTANTE:');
console.log('   - Si cambias el .env, debes reiniciar Metro bundler');
console.log('   - Usa: npm run start:clear');
console.log('   - Las variables EXPO_PUBLIC_* se inyectan en build time\n');
