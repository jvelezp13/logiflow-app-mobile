/**
 * Plugin de Expo para personalizar el nombre del APK generado.
 * El APK se generará como: logiflow-marcaje-{version}.apk
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

function withCustomApkName(config) {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Codigo Gradle para personalizar el nombre del APK
    const customApkNameCode = `
    // Personalizar nombre del APK (agregado por plugin withCustomApkName)
    applicationVariants.all { variant ->
        variant.outputs.all {
            def versionName = variant.versionName
            outputFileName = "logiflow-marcaje-\${versionName}.apk"
        }
    }`;

    // Verificar si ya existe la configuracion
    if (buildGradle.includes('applicationVariants.all')) {
      return config;
    }

    // Insertar antes del cierre del bloque android {}
    // Buscamos el ultimo cierre de bloque que corresponde a android {}
    const androidBlockEnd = buildGradle.lastIndexOf('\n}');

    if (androidBlockEnd !== -1) {
      config.modResults.contents =
        buildGradle.slice(0, androidBlockEnd) +
        customApkNameCode +
        buildGradle.slice(androidBlockEnd);
    }

    return config;
  });
}

module.exports = withCustomApkName;
