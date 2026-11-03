// Applies Huddle Duel's settings to a freshly generated native project:
// app icons, launch screen, portrait lock, version numbers, and release signing.
// Safe to run more than once.
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const gen = path.join(root, 'assets', 'generated');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const build = process.env.BUILD_NUMBER || process.env.PROJECT_BUILD_NUMBER || '1';
const platform = process.argv[2];

const read = p => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
function copyTree(src, dst) {
  for (const f of walk(src)) {
    const t = path.join(dst, path.relative(src, f));
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.copyFileSync(f, t);
  }
}
const warn = m => console.warn('! ' + m);
const ok = m => console.log('✓ ' + m);

function patchIOS() {
  const app = path.join(root, 'ios', 'App', 'App');
  // Icon
  const iconSet = walk(app).filter(f => f.includes('AppIcon.appiconset') && f.endsWith('.png'));
  if (iconSet.length) { iconSet.forEach(f => fs.copyFileSync(path.join(gen, 'ios', 'AppIcon-512@2x.png'), f)); ok('App icon'); }
  else warn('AppIcon.appiconset not found');
  // Launch screen
  const splash = walk(app).filter(f => f.includes('Splash.imageset') && f.endsWith('.png'));
  if (splash.length) { splash.forEach(f => fs.copyFileSync(path.join(gen, 'ios', 'splash-2732x2732.png'), f)); ok('Launch screen'); }
  else warn('Splash.imageset not found');
  // Info.plist: portrait only, full screen on iPad, no export-compliance prompt
  const plistPath = path.join(app, 'Info.plist');
  if (fs.existsSync(plistPath)) {
    let s = read(plistPath);
    const portrait = '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>';
    const portraitPad = '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\t<string>UIInterfaceOrientationPortraitUpsideDown</string>\n\t</array>';
    s = s.replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*)<array>[\s\S]*?<\/array>/, `$1${portrait}`);
    s = s.replace(/(<key>UISupportedInterfaceOrientations~ipad<\/key>\s*)<array>[\s\S]*?<\/array>/, `$1${portraitPad}`);
    const add = (key, val) => { if (!s.includes(`<key>${key}</key>`)) s = s.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${key}</key>\n\t${val}\n</dict>\n</plist>\n`); };
    add('UIRequiresFullScreen', '<true/>');
    add('ITSAppUsesNonExemptEncryption', '<false/>');
    write(plistPath, s); ok('Info.plist (portrait, full screen, encryption flag)');
  } else warn('Info.plist not found');
  // Version numbers
  const pbx = walk(path.join(root, 'ios', 'App')).find(f => f.endsWith('project.pbxproj'));
  if (pbx) {
    let s = read(pbx);
    s = s.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
         .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`)
         // iPhone only for now: iPad owners can still install it in iPhone mode
         .replace(/TARGETED_DEVICE_FAMILY = [^;]+;/g, 'TARGETED_DEVICE_FAMILY = 1;');
    write(pbx, s); ok(`Version ${version} (${build}), iPhone only`);
  } else warn('project.pbxproj not found');
}

function patchAndroid() {
  const res = path.join(root, 'android', 'app', 'src', 'main', 'res');
  if (!fs.existsSync(res)) { warn('android res folder not found'); return; }
  copyTree(path.join(gen, 'android'), res); ok('Launcher icons and splash');
  const bg = path.join(res, 'values', 'ic_launcher_background.xml');
  write(bg, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#111c2f</color>\n</resources>\n');
  // Portrait lock
  const man = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (fs.existsSync(man)) {
    let s = read(man);
    if (!s.includes('android:screenOrientation')) s = s.replace(/(<activity\b)/, '$1\n            android:screenOrientation="portrait"');
    write(man, s); ok('Portrait orientation');
  }
  // Version + release signing (uses the keystore Codemagic provides)
  const gradle = path.join(root, 'android', 'app', 'build.gradle');
  if (fs.existsSync(gradle)) {
    let s = read(gradle);
    s = s.replace(/versionCode \d+/, `versionCode ${parseInt(build, 10) || 1}`).replace(/versionName "[^"]*"/, `versionName "${version}"`);
    if (!s.includes('signingConfigs')) {
      const signing = `signingConfigs {
        release {
            if (System.getenv("CM_KEYSTORE_PATH")) {
                storeFile file(System.getenv("CM_KEYSTORE_PATH"))
                storePassword System.getenv("CM_KEYSTORE_PASSWORD")
                keyAlias System.getenv("CM_KEY_ALIAS")
                keyPassword System.getenv("CM_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            if (System.getenv("CM_KEYSTORE_PATH")) { signingConfig signingConfigs.release }`;
      const before = s;
      s = s.replace(/buildTypes\s*\{\s*release\s*\{/, signing);
      if (s === before) warn('Could not add release signing to build.gradle');
    }
    write(gradle, s); ok(`Version ${version} (${build}) and release signing`);
  } else warn('android/app/build.gradle not found');
}

if (platform === 'ios') patchIOS();
else if (platform === 'android') patchAndroid();
else { console.error('Usage: patch-native.mjs ios|android'); process.exit(1); }
