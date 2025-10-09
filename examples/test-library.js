#!/usr/bin/env node

// Quick test to verify library exports work correctly
const { 
  AuthPKCELibrary, 
  createAuthPKCE, 
  addAuthToCLI,
  ConfigManager 
} = require('../dist/index.js');

console.log('✅ Testing library exports...\n');

// Test 1: AuthPKCELibrary class
console.log('1. AuthPKCELibrary class:');
const authLib = new AuthPKCELibrary({
  cliName: 'test-cli',
  version: '1.0.0',
  silent: true
});
console.log('   ✅ AuthPKCELibrary instance created');

// Test 2: createAuthPKCE factory function
console.log('2. createAuthPKCE factory:');
const authLib2 = createAuthPKCE({ cliName: 'test-cli-2' });
console.log('   ✅ createAuthPKCE factory works');

// Test 3: Check if methods exist
console.log('3. AuthPKCELibrary methods:');
const methods = ['addAuthCommands', 'createCLI', 'configure', 'login', 'logout', 'whoami', 'refresh', 'status', 'token'];
methods.forEach(method => {
  if (typeof authLib[method] === 'function') {
    console.log(`   ✅ ${method}() method exists`);
  } else {
    console.log(`   ❌ ${method}() method missing`);
  }
});

// Test 4: ConfigManager export
console.log('4. ConfigManager:');
if (ConfigManager && typeof ConfigManager.getInstance === 'function') {
  console.log('   ✅ ConfigManager exported correctly');
} else {
  console.log('   ❌ ConfigManager export issue');
}

// Test 5: addAuthToCLI function
console.log('5. addAuthToCLI function:');
if (typeof addAuthToCLI === 'function') {
  console.log('   ✅ addAuthToCLI function exported');
} else {
  console.log('   ❌ addAuthToCLI function missing');
}

console.log('\n🎉 Library export tests completed!');
console.log('\n💡 Try the ali-cli example:');
console.log('   cd examples/ali-cli');
console.log('   npm install && npm run build');
console.log('   node dist/cli.js hello --name "Your Name"');
