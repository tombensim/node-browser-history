export const path = require('path'),
    fs = require('fs');
export const CHROME = 'Google Chrome';
export const FIREFOX = 'Mozilla Firefox';
export const TORCH = 'Torch';
export const OPERA = 'Opera';
export const SEAMONKEY = 'SeaMonkey';
export const VIVALDI = 'Vivaldi';
export const SAFARI = 'Safari';
export const MAXTHON = 'Maxthon';
export const INTERNETEXPLORER = 'Internet Explorer';


export class Browsers {

    CHROME = 'Google Chrome';
    FIREFOX = 'Mozilla Firefox';
    TORCH = 'Torch';
    OPERA = 'Opera';
    SEAMONKEY = 'SeaMonkey';
    VIVALDI = 'Vivaldi';
    SAFARI = 'Safari';
    MAXTHON = 'Maxthon';
    INTERNETEXPLORER = 'Internet Explorer';
    browserDbLocations = {
        chrome: [],
        firefox: '',
        opera: '',
        ie: '',
        torch: '',
        seamonkey: '',
        vivaldi: '',
        maxthon: '',
        safari: ''
    }

    defaultPaths = {
        chrome: '',
        firefox: '',
        opera: '',
        ie: '',
        torch: '',
        seamonkey: '',
        vivaldi: '',
        maxthon: '',
        safari: '',
        edge: ''
    }

    constructor() {
        if (process.platform !== 'darwin') {

            let basePath = path.join(process.env.HOMEDRIVE, 'Users', process.env.USERNAME, 'AppData')

            this.defaultPaths.chrome = path.join(basePath, 'Local', 'Google', 'Chrome')
            this.defaultPaths.firefox = path.join(basePath, 'Roaming', 'Mozilla', 'Firefox')
            this.defaultPaths.opera = path.join(basePath, 'Roaming', 'Opera Software')
            this.defaultPaths.ie = path.join(basePath, 'Local', 'Microsoft', 'Windows', 'History', 'History.IE5')
            this.defaultPaths.edge = path.join(basePath, 'Local', 'Packages')
            this.defaultPaths.torch = path.join(basePath, 'Local', 'Torch', 'User Data')
            this.defaultPaths.seamonkey = path.join(basePath, 'Roaming', 'Mozilla', 'SeaMonkey')

        }
        else {
            let homeDirectory = process.env.HOME

            this.defaultPaths.chrome = path.join(homeDirectory, 'Library', 'Application Support', 'Google', 'Chrome')
            this.defaultPaths.firefox = path.join(homeDirectory, 'Library', 'Application Support', 'Firefox')
            this.defaultPaths.safari = path.join(homeDirectory, 'Library', 'Safari')
            this.defaultPaths.opera = path.join(homeDirectory, 'Library', 'Application Support', 'com.operasoftware.Opera')
            this.defaultPaths.maxthon = path.join(homeDirectory, 'Library', 'Application Support', 'com.maxthon.mac.Maxthon')
            this.defaultPaths.vivaldi = path.join(homeDirectory, 'Library', 'Application Support', 'Vivaldi', 'Default')
            this.defaultPaths.seamonkey = path.join(homeDirectory, 'Library', 'Application Support', 'SeaMonkey', 'Profiles')
        }
    }


    /**
     * Find all files recursively in specific folder with specific extension, e.g:
     * findFilesInDir('./project/src', '.html') ==> ['./project/src/a.html','./project/src/build/index.html']
     * @param  {String} startPath    Path relative to this file or other file which requires this files
     * @param  {String} filter       Extension name, e.g: '.html'
     * @param regExp
     * @return {Array}               Result files with path string in an array
     */
     findFilesInDir(startPath, filter, regExp = new RegExp('.*')) {

        let results = []

        if (!fs.existsSync(startPath)) {
            //console.log("no dir ", startPath);
            return results
        }

        let files = fs.readdirSync(startPath)
        for (let i = 0; i < files.length; i++) {
            let filename = path.join(startPath, files[i])
            if (!fs.existsSync(filename)) {
                //console.log('file doesn\'t exist ', startPath);
                return results
            }
            let stat = fs.lstatSync(filename)
            if (stat.isDirectory()) {
                results = results.concat(this.findFilesInDir(filename, filter, regExp)) //recurse
            }
            else if (filename.indexOf(filter) >= 0 && regExp.test(filename)) {
                //console.log('-- found: ', filename);
                results.push(filename)
            }
        }
        return results
    }

    /**
     * Finds the path to the browsers DB file.
     * Returns an array of strings, paths, or an empty array
     * @param path
     * @param browserName
     * @returns {Array}
     */
     findPaths(path, browserName) {
        switch (browserName) {
            case FIREFOX:
            case SEAMONKEY:
                return this.findFilesInDir(path, '.sqlite', /places.sqlite$/)
            case CHROME:
            case TORCH:
            case OPERA:
                return this.findFilesInDir(path, 'History', /History$/)
            case VIVALDI:
                return this.findFilesInDir(path, '.sqlite')
            case SAFARI:
                return this.findFilesInDir(path, '.db', /History.db$/)
            case MAXTHON:
                return this.findFilesInDir(path, '.dat', /History.dat$/)
            default:
                return []
        }
    }

}
