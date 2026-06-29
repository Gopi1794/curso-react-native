// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.maxWorkers = 2;

// Evita que Metro vigile artefactos de build de Gradle/Xcode dentro de
// node_modules — causa errores "UNKNOWN watch" en Windows cuando Gradle
// limpia archivos mientras Metro los tiene indexados.
config.resolver.blockList = [
    /.*[\/\\]android[\/\\]build[\/\\].*/,
    /.*[\/\\]android[\/\\]\.gradle[\/\\].*/,
    /.*[\/\\]\.transforms[\/\\].*/,
    /.*[\/\\]ios[\/\\]build[\/\\].*/,
    /.*[\/\\]ios[\/\\]Pods[\/\\].*/,
    /.*[\/\\]expo-modules-autolinking[\/\\]android[\/\\].*/,
];

module.exports = config;
