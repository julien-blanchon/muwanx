/**
 * MuJoCo Asset Analyzer
 * 
 * This component analyzes MuJoCo XML files to detect all referenced assets
 * (meshes, textures, includes, etc.) similar to the Python generate_index.py script.
 * 
 * Usage:
 *   const analyzer = new MuJoCoAssetAnalyzer();
 *   const assets = await analyzer.analyzeScene('./examples/scenes/unitree_go2/scene.xml');
 */

export class MuJoCoAssetAnalyzer {
    constructor(options = {}) {
        // Attributes that may reference external resources
        this.REFERENCE_ATTRS = new Set(['file', 'href', 'src']);
        
        // Map MJCF tags to compiler attributes that provide directory hints
        this.TAG_DIRECTORY_HINTS = {
            'include': ['includedir'],
            'mesh': ['meshdir'],
            'texture': ['texturedir'],
            'heightfield': ['heightfielddir'],
            'skin': ['skindir'],
        };
        
        // Binary file extensions
        this.BINARY_EXTENSIONS = ['.png', '.stl', '.skn', '.mjb'];
        
        this.cache = new Map();
    }

    /**
     * Analyze a MuJoCo XML file and return all referenced assets
     * @param {string} xmlPath - Path to the root XML file (e.g., 'unitree_go2/scene.xml')
     * @param {string} baseUrl - Base URL for fetching files (default: './examples/scenes')
     * @returns {Promise<string[]>} Array of relative asset paths
     */
    async analyzeScene(xmlPath, baseUrl = './examples/scenes') {

        // Input validation
        if (!xmlPath || typeof xmlPath !== 'string') {
            throw new Error(`Invalid xmlPath: ${xmlPath}`);
        }
        
        if (!baseUrl || typeof baseUrl !== 'string') {
            throw new Error(`Invalid baseUrl: ${baseUrl}`);
        }
        
        // Normalize the xmlPath to handle both 'unitree_go2/scene.xml' and '/examples/scenes/unitree_go2/scene.xml'
        let normalizedXmlPath = xmlPath;
        
        // Remove leading slash and common prefixes
        normalizedXmlPath = normalizedXmlPath.replace(/^\/+/, '');
        
        // If the path starts with 'examples/scenes/', remove that prefix
        if (normalizedXmlPath.startsWith('examples/scenes/')) {
            normalizedXmlPath = normalizedXmlPath.substring('examples/scenes/'.length);
        }
        
        const cacheKey = `${baseUrl}/${normalizedXmlPath}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            return Array.isArray(cached) ? cached : [];
        }

        try {
            const result = await this._collectAssets(normalizedXmlPath, baseUrl);
            const validResult = Array.isArray(result) ? result : [];
            this.cache.set(cacheKey, validResult);
            return validResult;
        } catch (error) {
            return [];
        }
    }

    /**
     * Clear the analysis cache
     */
    clearCache() {
        this.cache.clear();
    }

    async _collectAssets(rootPath, baseUrl) {
        const rootDir = this._getDirectoryPath(rootPath);
        
        const visited = new Set();
        const collected = new Set();

        const walk = async (filePath, parentHints = {}) => {
            const normalizedPath = this._normalizePath(filePath);
            const fullFilePath = `${baseUrl}/${filePath}`;
            
            if (visited.has(normalizedPath)) {
                return;
            }
            visited.add(normalizedPath);
            
            // Add the file itself to collected assets (relative to root directory)
            const relativeToRoot = this._getRelativeToRoot(normalizedPath, rootDir);
            collected.add(relativeToRoot);

            let xmlContent;
            try {
                const response = await fetch(fullFilePath);
                if (!response.ok) {
                    console.warn(`[MuJoCoAssetAnalyzer] Failed to fetch ${fullFilePath}: ${response.status}`);
                    return;
                }
                xmlContent = await response.text();
            } catch (error) {
                console.error(`[MuJoCoAssetAnalyzer] Error fetching ${filePath}:`, error);
                return;
            }

            const baseDir = this._getDirectoryPath(filePath);
            const localHints = this._parseCompilerDirectories(xmlContent, baseDir);
            const directoryHints = this._mergeDirectoryHints(parentHints, localHints);
            
            // Parse XML and find references
            const parser = new DOMParser();
            let xmlDoc;
            try {
                xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
                const parseError = xmlDoc.querySelector('parsererror');
                if (parseError) {
                    throw new Error(parseError.textContent);
                }
            } catch (error) {
                console.warn(`[MuJoCoAssetAnalyzer] Failed to parse XML ${filePath}:`, error.message);
                return;
            }

            // Walk through all elements to find references
            const allElements = xmlDoc.getElementsByTagName('*');
            
            for (const element of allElements) {
                const tagName = this._stripNamespace(element.tagName.toLowerCase());
                
                for (const attrName of this.REFERENCE_ATTRS) {
                    const attrValue = element.getAttribute(attrName);
                    if (!attrValue) continue;

                    const reference = await this._resolveReference(
                        attrValue,
                        tagName,
                        attrName,
                        baseDir,
                        rootDir,
                        directoryHints,
                        baseUrl
                    );

                    if (reference) {
                        if (reference.path) {
                            const assetRelativePath = this._getRelativeToRoot(reference.path, rootDir);
                            collected.add(assetRelativePath);
                            
                            // Recursively process include files
                            if (tagName === 'include' && attrName === 'file') {
                                await walk(reference.path, directoryHints);
                            }
                        } else if (reference.text) {
                            collected.add(reference.text);
                        }
                    }
                }
            }
        };

        try {
            await walk(rootPath);
        } catch (error) {
            console.error(`[MuJoCoAssetAnalyzer] Error during asset collection for ${rootPath}:`, error);
            throw error;
        }
        
        const result = Array.from(collected).sort();
        
        // Validate result
        if (!Array.isArray(result)) {
            console.error('[MuJoCoAssetAnalyzer] Internal error: result is not an array');
            return [];
        }
        
        console.log(`[MuJoCoAssetAnalyzer] Successfully analyzed ${rootPath}: found ${result.length} assets`);
        return result;
    }

    _getRelativeToRoot(filePath, rootDir) {
        if (!rootDir || rootDir === '') return filePath;
        
        // Normalize paths by removing empty parts
        const pathParts = filePath.split('/').filter(p => p);
        const rootParts = rootDir.split('/').filter(p => p);
        
        // Find common prefix length
        let commonLength = 0;
        const minLength = Math.min(pathParts.length, rootParts.length);
        for (let i = 0; i < minLength; i++) {
            if (pathParts[i] === rootParts[i]) {
                commonLength++;
            } else {
                break;
            }
        }
        
        // Return the relative path (everything after the common prefix)
        return pathParts.slice(commonLength).join('/');
    }

    _parseCompilerDirectories(xmlContent, baseDir) {
        const directories = {};
        
        // Parse XML properly to find all compiler elements
        const parser = new DOMParser();
        let xmlDoc;
        try {
            xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                return this._parseCompilerDirectoriesRegex(xmlContent, baseDir);
            }
        } catch (error) {
            return this._parseCompilerDirectoriesRegex(xmlContent, baseDir);
        }

        // Find all compiler elements
        const compilerElements = xmlDoc.getElementsByTagName('compiler');
        
        for (const compiler of compilerElements) {
            for (let i = 0; i < compiler.attributes.length; i++) {
                const attr = compiler.attributes[i];
                const attrName = attr.name.toLowerCase();
                const attrValue = attr.value.trim();
                
                if ((attrName.endsWith('dir') || attrName.endsWith('path')) && attrValue) {
                    let normalizedPath;
                    if (attrValue.startsWith('/')) {
                        normalizedPath = attrValue;
                    } else {
                        // Join with base directory - this is crucial for MuJoCo path resolution
                        normalizedPath = baseDir ? this._joinPath(baseDir, attrValue) : attrValue;
                    }
                    
                    if (!directories[attrName]) {
                        directories[attrName] = [];
                    }
                    directories[attrName].push(normalizedPath);
                }
            }
        }
        
        return directories;
    }

    _parseCompilerDirectoriesRegex(xmlContent, baseDir) {
        const directories = {};
        
        // Simple regex to find compiler elements and their attributes
        const compilerRegex = /<compiler[^>]*>/gi;
        const matches = xmlContent.match(compilerRegex) || [];
        
        for (const match of matches) {
            // Extract attributes from compiler element
            const attrRegex = /(\w+)\s*=\s*["']([^"']*?)["']/g;
            let attrMatch;
            
            while ((attrMatch = attrRegex.exec(match)) !== null) {
                const attrName = attrMatch[1].toLowerCase();
                const attrValue = attrMatch[2].trim();
                
                if ((attrName.endsWith('dir') || attrName.endsWith('path')) && attrValue) {
                    let normalizedPath;
                    if (attrValue.startsWith('/') || attrValue.includes('://')) {
                        normalizedPath = attrValue;
                    } else {
                        normalizedPath = this._joinPath(baseDir, attrValue);
                    }
                    
                    if (!directories[attrName]) {
                        directories[attrName] = [];
                    }
                    directories[attrName].push(normalizedPath);
                }
            }
        }
        
        return directories;
    }

    _mergeDirectoryHints(parentHints, localHints) {
        const merged = { ...parentHints };
        
        for (const [key, paths] of Object.entries(localHints)) {
            if (merged[key]) {
                merged[key] = [...merged[key], ...paths];
            } else {
                merged[key] = [...paths];
            }
        }
        
        // Remove duplicates
        for (const key in merged) {
            merged[key] = [...new Set(merged[key])];
        }
        
        return merged;
    }

    _buildSearchOrder(tag, directoryHints, baseDir) {
        const order = [];
        
        // For include files, prioritize the same directory first
        if (tag === 'include') {
            // Add the file's folder first for include files
            if (baseDir) {
                order.push(baseDir);
            }
            order.push(''); // root directory
        }
        
        // Tag-specific hints (this is crucial for MuJoCo asset resolution)
        const hints = this.TAG_DIRECTORY_HINTS[tag] || [];
        for (const hint of hints) {
            if (directoryHints[hint]) {
                order.push(...directoryHints[hint]);
            }
        }
        
        // For non-include files, add common asset directories
        if (tag !== 'include') {
            const commonDirs = ['assets', 'meshes', 'textures'];
            for (const commonDir of commonDirs) {
                if (baseDir) {
                    order.push(this._joinPath(baseDir, commonDir));
                } else {
                    order.push(commonDir);
                }
            }
        }
        
        // Fall back to every known compiler directory
        for (const paths of Object.values(directoryHints)) {
            order.push(...paths);
        }
        
        // For non-include files, add the file's folder and root directory
        if (tag !== 'include') {
            if (baseDir) {
                order.push(baseDir);
            }
            order.push('');
        }
        
        // Remove duplicates while preserving order
        return [...new Set(order.filter(path => path !== undefined))];
    }

    async _resolveLocalFile(value, baseDir, searchDirs, baseUrl) {
        if (!value.trim()) return null;

        if (this.debug) {
            console.log(`[MuJoCoAssetAnalyzer] _resolveLocalFile: value="${value}", baseDir="${baseDir}", searchDirs=[${searchDirs.join(', ')}]`);
        }

        // Handle absolute paths first
        if (value.startsWith('/')) {
            try {
                const response = await fetch(`${baseUrl}${value}`, { method: 'HEAD' });
                if (response.ok) return value.substring(1); // Remove leading slash
            } catch (error) {
                // Continue to relative resolution
            }
        }

        // Search in order: search directories first, then base directory
        for (const directory of searchDirs) {
            const candidate = this._joinPath(directory, value);
            const fullUrl = `${baseUrl}/${candidate}`;
            
            if (this.debug) {
                console.log(`[MuJoCoAssetAnalyzer] Trying: ${fullUrl}`);
            }
            
            try {
                const response = await fetch(fullUrl, { method: 'HEAD' });
                if (response.ok) {
                    if (this.debug) {
                        console.log(`[MuJoCoAssetAnalyzer] Found: ${candidate}`);
                    }
                    return candidate;
                }
                if (this.debug) {
                    console.log(`[MuJoCoAssetAnalyzer] Not found (${response.status}): ${fullUrl}`);
                }
            } catch (error) {
                if (this.debug) {
                    console.log(`[MuJoCoAssetAnalyzer] Error accessing: ${fullUrl} - ${error.message}`);
                }
            }
        }

        if (this.debug) {
            console.log(`[MuJoCoAssetAnalyzer] Could not resolve: ${value}`);
        }
        return null;
    }

    async _resolveReference(rawValue, tag, attr, baseDir, rootDir, directoryHints, baseUrl) {
        const value = rawValue.trim();
        if (!value) return null;
        

        
        const lower = value.toLowerCase();
        
        // Skip HTTP URLs
        if (lower.startsWith('http://') || lower.startsWith('https://')) {
            return { text: value };
        }

        // Handle file:// URLs
        if (lower.startsWith('file://')) {
            console.warn(`[MuJoCoAssetAnalyzer] file:// URLs not supported in browser: ${value}`);
            return null;
        }

        // Handle archive references (file@member)
        if (value.includes('@') && !value.startsWith('@')) {
            const [prefix, member] = value.split('@', 2);
            if (!member) {
                console.warn(`[MuJoCoAssetAnalyzer] Invalid archive reference: ${value}`);
                return null;
            }
            
            const searchDirs = this._buildSearchOrder(tag, directoryHints, baseDir);
            const archivePath = await this._resolveLocalFile(prefix, baseDir, searchDirs, baseUrl);
            if (!archivePath) return null;
            
            const archiveRel = this._getRelativePath(archivePath, rootDir);
            return { text: `${archiveRel}@${member}` };
        }

        // Resolve local file
        const searchDirs = this._buildSearchOrder(tag, directoryHints, baseDir);
        const resolved = await this._resolveLocalFile(value, baseDir, searchDirs, baseUrl);
        
        if (!resolved) return null;
        
        return { path: resolved };
    }

    _stripNamespace(tag) {
        if (tag.includes(':')) {
            return tag.split(':', 2)[1];
        }
        return tag;
    }

    _normalizePath(path) {
        if (!path) return '';
        
        // Remove leading slashes, dots, and normalize multiple slashes
        let normalized = path.replace(/^[./]+/, '').replace(/\/+/g, '/');
        
        // Remove trailing slashes
        normalized = normalized.replace(/\/+$/, '');
        
        return normalized;
    }

    _getDirectoryPath(filePath) {
        const parts = filePath.split('/');
        return parts.slice(0, -1).join('/');
    }

    _joinPath(...parts) {
        const filtered = parts.filter(part => part !== null && part !== undefined && part !== '.');
        if (filtered.length === 0) return '';
        
        const joined = filtered.join('/').replace(/\/+/g, '/');
        
        // Don't remove leading slash if the first part was absolute
        if (parts[0] && parts[0].startsWith('/')) {
            return joined;
        }
        
        return joined.replace(/^\//, '');
    }

    _getRelativePath(path, basePath) {
        if (!basePath) return path;
        
        const pathParts = path.split('/').filter(p => p);
        const baseParts = basePath.split('/').filter(p => p);
        
        // Remove common prefix
        let i = 0;
        while (i < pathParts.length && i < baseParts.length && pathParts[i] === baseParts[i]) {
            i++;
        }
        
        // Return the remaining path parts
        return pathParts.slice(i).join('/');
    }
}

// Export a singleton instance for convenience
export const mujocoAssetAnalyzer = new MuJoCoAssetAnalyzer();