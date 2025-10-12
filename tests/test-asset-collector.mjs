#!/usr/bin/env node

import { mujocoAssetCollector } from '../src/mujoco_wasm/utils/mujocoAssetCollector.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Mock fetch for Node.js environment
global.fetch = async (url, options = {}) => {
    try {
        // Convert URL to file path
        const urlPath = url.replace(/^.*\/examples\/scenes\//, '');
        // Use absolute path based on project root for reliability
        const filePath = path.join(projectRoot, 'public', 'examples', 'scenes', urlPath);
        
        if (options.method === 'HEAD') {
            // Check if file exists
            try {
                await fs.access(filePath);
                return { ok: true };
            } catch {
                return { ok: false };
            }
        } else {
            // Read file content
            const content = await fs.readFile(filePath, 'utf8');
            return {
                ok: true,
                text: () => Promise.resolve(content)
            };
        }
    } catch (error) {
        return { ok: false, status: 404 };
    }
};

// Mock DOMParser for Node.js
global.DOMParser = class {
    parseFromString(xmlString, mimeType) {
        // Simple XML parser for testing - just extract elements and attributes
        const elements = [];
        const elementRegex = /<(\w+)([^>]*?)(?:\s*\/>|>)/g;
        let match;
        
        while ((match = elementRegex.exec(xmlString)) !== null) {
            const tagName = match[1];
            const attributesStr = match[2];
            
            const attributes = {};
            const attrRegex = /(\w+)\s*=\s*["']([^"']*?)["']/g;
            let attrMatch;
            
            while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
                attributes[attrMatch[1]] = attrMatch[2];
            }
            
            elements.push({
                tagName: tagName.toLowerCase(),
                getAttribute: (name) => attributes[name] || null,
                attributes: Object.keys(attributes).map(name => ({ name, value: attributes[name] }))
            });
        }
        
        return {
            documentElement: { tagName: 'root' },
            getElementsByTagName: (tagName) => {
                if (tagName === '*') return elements;
                return elements.filter(el => el.tagName === tagName.toLowerCase());
            },
            querySelector: (selector) => {
                if (selector === 'parsererror') return null;
                return null;
            }
        };
    }
};

async function testAssetAnalyzer() {
    console.log('🧪 Testing MuJoCo Asset Analyzer\n');
    
    // Expected assets from Python script (index.json files)
    const expectedAssets = {
        unitree_go2: [
            "assets/base_0.obj",
            "assets/base_1.obj",
            "assets/base_2.obj",
            "assets/base_3.obj",
            "assets/base_4.obj",
            "assets/calf_0.obj",
            "assets/calf_1.obj",
            "assets/calf_mirror_0.obj",
            "assets/calf_mirror_1.obj",
            "assets/foot.obj",
            "assets/hip_0.obj",
            "assets/hip_1.obj",
            "assets/thigh_0.obj",
            "assets/thigh_1.obj",
            "assets/thigh_mirror_0.obj",
            "assets/thigh_mirror_1.obj",
            "go2.xml",
            "scene.xml"
        ],
        unitree_go1: [
            "go1.xml",
            "meshes/calf.obj",
            "meshes/hip.obj",
            "meshes/thigh.obj",
            "meshes/thigh_mirror.obj",
            "meshes/trunk.obj"
        ],
        berkeley_humanoid: [
            "assets/ll_faa.stl",
            "assets/ll_ffe.stl",
            "assets/ll_haa.stl",
            "assets/ll_hfe.stl",
            "assets/ll_hr.stl",
            "assets/ll_kfe.stl",
            "assets/lr_faa.stl",
            "assets/lr_ffe.stl",
            "assets/lr_haa.stl",
            "assets/lr_hfe.stl",
            "assets/lr_hr.stl",
            "assets/lr_kfe.stl",
            "assets/torso.stl",
            "berkeley_humanoid.xml",
            "scene.xml"
        ]
    };

    const testCases = [
  {
    name: 'unitree_go2',
    xmlPath: '/examples/scenes/unitree_go2/scene.xml',
    expectedFiles: expectedAssets.unitree_go2
  },
  {
    name: 'unitree_go1',
    xmlPath: '/examples/scenes/unitree_go1/go1.xml',
    expectedFiles: expectedAssets.unitree_go1
  },
  {
    name: 'berkeley_humanoid',
    xmlPath: '/examples/scenes/berkeley_humanoid/scene.xml',
    expectedFiles: expectedAssets.berkeley_humanoid
  }
];    let allTestsPassed = true;

    for (const testCase of testCases) {
        console.log(`\n📁 Testing: ${testCase.name}`);
        console.log('─'.repeat(50));
        
        try {
            // Use absolute path for the base path to be reliable regardless of working directory  
            const basePath = path.join(projectRoot, 'examples', 'scenes');
            
            const jsAssets = await mujocoAssetCollector.analyzeScene(testCase.xmlPath, basePath);
            const expectedAssetsForTest = testCase.expectedFiles.sort();
            
            console.log(`✨ JavaScript found: ${jsAssets.length} assets`);
            console.log(`🎯 Expected: ${expectedAssetsForTest.length} assets`);
            
            // Compare results
            const missing = expectedAssetsForTest.filter(asset => !jsAssets.includes(asset));
            const extra = jsAssets.filter(asset => !expectedAssetsForTest.includes(asset));
            const matching = expectedAssetsForTest.filter(asset => jsAssets.includes(asset));
            
            console.log(`✅ Matching: ${matching.length} assets`);
            
            if (missing.length === 0 && extra.length === 0) {
                console.log('🎉 PERFECT MATCH!');
            } else {
                allTestsPassed = false;
                
                if (missing.length > 0) {
                    console.log(`❌ Missing (${missing.length}):`);
                    missing.forEach(asset => console.log(`   - ${asset}`));
                }
                
                if (extra.length > 0) {
                    console.log(`⚠️  Extra (${extra.length}):`);
                    extra.forEach(asset => console.log(`   + ${asset}`));
                }
            }
            
            console.log('\n📋 JavaScript found:');
            jsAssets.forEach((asset, i) => console.log(`   ${i + 1}. ${asset}`));
            
        } catch (error) {
            allTestsPassed = false;
            console.log(`💥 ERROR: ${error.message}`);
            console.error(error.stack);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    if (allTestsPassed) {
        console.log('🎊 ALL TESTS PASSED! Asset analyzer works correctly.');
    } else {
        console.log('❌ SOME TESTS FAILED. Asset analyzer needs fixes.');
    }
    console.log('='.repeat(60));
}

// Run the test
testAssetAnalyzer().catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});