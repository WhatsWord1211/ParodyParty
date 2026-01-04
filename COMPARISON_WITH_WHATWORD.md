# Comparison: Parody Party vs WhatWord Foundation

## Key Differences Found

### 1. **Expo SDK Version** ⚠️ MAJOR DIFFERENCE
- **WhatWord**: SDK 54.0.27
- **Parody Party**: SDK 50.0.0
- **Impact**: Different SDK versions have different behaviors with Expo Go

### 2. **React & React Native Versions**
- **WhatWord**: 
  - React 19.1.0
  - React Native 0.81.5
- **Parody Party**: 
  - React 18.2.0
  - React Native 0.73.6
- **Impact**: Older versions, but should work fine

### 3. **React Navigation**
- **WhatWord**: v7.1.17 / v7.3.26
- **Parody Party**: v6.1.9 / v6.9.17
- **Impact**: Compatible with SDK 50, but different API

### 4. **Babel Configuration** ⚠️ IMPORTANT
- **WhatWord**: Uses absolute paths to local babel-preset-expo
  ```js
  const localBabelPresetExpo = path.resolve(__dirname, 'node_modules', 'expo', 'node_modules', 'babel-preset-expo');
  ```
- **Parody Party**: Uses standard config
  ```js
  presets: ['babel-preset-expo']
  ```
- **Impact**: WhatWord's approach avoids global conflicts

### 5. **Metro Config**
- **WhatWord**: None (uses default)
- **Parody Party**: Has metro.config.js
- **Impact**: Shouldn't matter, but WhatWord relies on defaults

### 6. **Firebase Version**
- **WhatWord**: Firebase 12.3.0
- **Parody Party**: Firebase 10.7.1
- **Impact**: Older version, but compatible with SDK 50

### 7. **expo-updates**
- **WhatWord**: 29.0.15 (SDK 54)
- **Parody Party**: 0.24.0 (SDK 50)
- **Impact**: Different versions, but both should work

### 8. **app.json Differences**
- **WhatWord**:
  - Has `owner`: "wilderbssmstr"
  - Has `sdkVersion`: "54.0.0"
  - Has `runtimeVersion`: "1.2.8"
  - Has `updates.url` pointing to EAS
  - Has EAS `projectId` in extra
- **Parody Party**:
  - No `owner`
  - No `sdkVersion` (uses package.json version)
  - No `runtimeVersion`
  - No `updates.url`
  - No EAS `projectId`

### 9. **Additional Packages in WhatWord**
- `expo-build-properties`
- `expo-navigation-bar`
- `expo-tracking-transparency`
- `expo-video`
- `react-native-google-mobile-ads`
- `react-native-draggable-flatlist`
- `react-native-svg`
- `firebase-admin`

### 10. **Web Support**
- **WhatWord**: No web dependencies (not configured for web)
- **Parody Party**: Has `react-native-web`, `react-dom`, `@expo/metro-runtime`

## Most Likely Issue: Babel Config

The **babel.config.js** difference is significant. WhatWord uses absolute paths to ensure it uses the local babel-preset-expo from node_modules, which avoids conflicts and ensures compatibility.

## Recommendation

Try updating Parody Party's babel.config.js to match WhatWord's pattern:

```js
const path = require('path');

module.exports = function(api) {
  api.cache(true);
  
  const localBabelPresetExpo = path.resolve(__dirname, 'node_modules', 'expo', 'node_modules', 'babel-preset-expo');
  const localReanimatedPlugin = path.resolve(__dirname, 'node_modules', 'react-native-reanimated', 'plugin');
  
  return {
    presets: [
      [localBabelPresetExpo, { jsxRuntime: 'automatic' }]
    ],
    plugins: [
      localReanimatedPlugin,
    ],
  };
};
```

This might resolve the Expo Go update issue.


