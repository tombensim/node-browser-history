import {Browsers} from './Browsers'
import * as path from 'path'
import * as fs from 'fs'

const moment = require('moment')
import {v4} from "uuid"
import {Database} from 'sqlite3'

export class Runner {
    browsers: Browsers = new Browsers();
    // constructor() {
    //
    // }
    /**
     * Runs the the proper  for the given browser. Some this.browsers follow the same standards as
     * chrome and firefox others have their own syntax.
     * Returns an empty array or an array of browser record objects
     * @param paths
     * @param browserName
     * @param historyTimeLength
     * @returns {Promise<array>}
     */
    async getBrowserHistory(paths = [], browserName, historyTimeLength) {
        switch (browserName) {
            case this.browsers.FIREFOX:
            case this.browsers.SEAMONKEY:
                return await this.getMozillaBasedBrowserRecords(paths, browserName, historyTimeLength)

            case this.browsers.CHROME:
            case this.browsers.OPERA:
            case this.browsers.TORCH:
            case this.browsers.VIVALDI:
                return await this.getChromeBasedBrowserRecords(paths, browserName, historyTimeLength)

            case this.browsers.MAXTHON:
                return await this.getMaxthonBasedBrowserRecords(paths, browserName, historyTimeLength)

            case this.browsers.SAFARI:
                return await this.getSafariBasedBrowserRecords(paths, browserName, historyTimeLength)

            case this.browsers.INTERNETEXPLORER:
                //Only do this on Windows we have to do t his here because the DLL manages this
                if (process.platform !== "win32") {
                    return []
                }
            // return await this.getInternetExplorerBasedBrowserRecords(historyTimeLength)

            default:
                return []
        }
    }

    // getInternetExplorerBasedBrowserRecords(historyTimeLength) {
    // let internetExplorerHistory = []
    // return new Promise((resolve, reject) => {
    //     this.getInternetExplorerHistory(null, (error, s) => {
    //         if (error) {
    //             throw(error)
    //         }
    //         else {
    //             let currentTime = moment.utc()
    //             let fiveMinutesAgo = currentTime.subtract(historyTimeLength, "minutes")
    //             s.forEach(record => {
    //                 let lastVisited = moment.utc(record.LastVisited)
    //                 if (lastVisited > fiveMinutesAgo) {
    //                     if (!record.URL.startsWith("file:///")) {
    //                         internetExplorerHistory.push({
    //                             title: record.Title,
    //                             utc_time: lastVisited.valueOf(),
    //                             url: record.URL,
    //                             browser: this.browsers.INTERNETEXPLORER
    //                         })
    //                     }
    //                 }
    //             })
    //             resolve(internetExplorerHistory)
    //         }
    //     })
    // })
    // }

    async getChromeBasedBrowserRecords(paths, browserName, historyTimeLength) {
        let browserHistory = [];
        const data = [];

        const dataPromises = paths.map(p => {
            return new Promise((resolve, reject) => {
                let newDbPath = path.join(process.env.TMP ? process.env.TMP : process.env.TMPDIR, v4() + ".sqlite")
                //Assuming the sqlite file is locked so lets make a copy of it
                let readStream = fs.createReadStream(p)
                let writeStream = fs.createWriteStream(newDbPath)
                let stream = readStream.pipe(writeStream)
                stream.on("finish", () => {
                    let db = new Database(newDbPath)
                    db.serialize(() => {
                        const sql = "SELECT title, last_visit_time, url from urls WHERE DATETIME (last_visit_time/1000000 + (strftime('%s', '1601-01-01')), 'unixepoch')  >= DATETIME('now', '-" +
                            historyTimeLength + " minutes')";
                        const sqla = "SELECT title,url,last_visit_time from urls";
                        db.each(sqla
                            ,
                            (err, row) => {
                                if (err) {
                                    return reject(err)
                                }
                                else {
                                    let t = moment.unix(row.last_visit_time / 1000000 - 11644473600)
                                    browserHistory.push({
                                        title: row.title,
                                        utc_time: t.valueOf(),
                                        url: row.url,
                                        browser: browserName
                                    })
                                }
                            }
                        );
                        db.close(() => {
                            fs.unlink(newDbPath, (err) => {
                                if (err) {
                                    return reject(err)
                                }
                            });
                            return resolve(browserHistory)
                        })
                    })
                })
            })
        });
        return await Promise.all(dataPromises)
    }


    async getMozillaBasedBrowserRecords(paths, browserName, historyTimeLength) {
        let browserHistory = [],
            h = []
        return new Promise((resolve, reject) => {
            if (!paths || paths.length === 0) {
                resolve(browserHistory)
            }
            for (let i = 0; i < paths.length; i++) {
                if (paths[i] || paths[i] !== "") {

                    let newDbPath = path.join(process.env.TMP ? process.env.TMP : process.env.TMPDIR, v4() + ".sqlite")

                    //Assuming the sqlite file is locked so lets make a copy of it
                    const originalDB = new Database(paths[i])
                    originalDB.serialize(() => {
                        // This has to be called to merge .db-wall, the in memory db, to disk so we can access the history when
                        // the browser is open
                        originalDB.run("PRAGMA wal_checkpoint(FULL)")
                        originalDB.close(() => {

                            //Assuming the sqlite file is locked so lets make a copy of it
                            let readStream = fs.createReadStream(paths[i]),
                                writeStream = fs.createWriteStream(newDbPath),
                                stream = readStream.pipe(writeStream)

                            stream.on("finish", () => {
                                    const db = new Database(newDbPath)
                                    db.serialize(() => {
                                            db.each(
                                                "SELECT title, last_visit_date, url from moz_places WHERE DATETIME (last_visit_date/1000000, 'unixepoch')  >= DATETIME('now', '-" +
                                                historyTimeLength + " minutes')",
                                                (err, row) => {
                                                    if (err) {
                                                        reject(err)
                                                    }
                                                    else {
                                                        let t = moment.unix(row.last_visit_date / 1000000)
                                                        browserHistory.push({
                                                            title: row.title,
                                                            utc_time: t.valueOf(),
                                                            url: row.url,
                                                            browser: browserName,
                                                            lastVisitDate:row.last_visit_date,
                                                        })
                                                    }
                                                }
                                            )
                                            db.close(() => {
                                                fs.unlink(newDbPath, (err) => {
                                                    if (err) {
                                                        return reject(err)
                                                    }
                                                })
                                                resolve(browserHistory)
                                            })
                                        }
                                    )
                                }
                            )
                        })
                    })
                }
            }
        })

    }

    getMaxthonBasedBrowserRecords(paths, browserName, historyTimeLength) {
        let browserHistory = [],
            h = []
        return new Promise((resolve, reject) => {
            if (!paths || paths.length === 0) {
                resolve(browserHistory)
            }
            for (let i = 0; i < paths.length; i++) {
                if (paths[i] || paths[i] !== "") {

                    let newDbPath = path.join(process.env.TMP ? process.env.TMP : process.env.TMPDIR, v4() + ".db")

                    //Assuming the sqlite file is locked so lets make a copy of it
                    const originalDB = new Database(paths[i])
                    originalDB.serialize(() => {
                        // This has to be called to merge .db-wall, the in memory db, to disk so we can access the history when
                        // safari is open
                        originalDB.run("PRAGMA wal_checkpoint(FULL)")
                        originalDB.close(() => {
                            let readStream = fs.createReadStream(paths[i]),
                                writeStream = fs.createWriteStream(newDbPath),
                                stream = readStream.pipe(writeStream)

                            stream.on("finish", () => {
                                    const db = new Database(newDbPath)
                                    db.serialize(() => {
                                        db.run("PRAGMA wal_checkpoint(FULL)")
                                        db.each(
                                            "SELECT `zlastvisittime`, `zhost`, `ztitle`, `zurl` FROM   zmxhistoryentry WHERE  Datetime (`zlastvisittime` + 978307200, 'unixepoch') >= Datetime('now', '-" +
                                            historyTimeLength + " minutes')",
                                            (err, row) => {
                                                if (err) {
                                                    reject(err)
                                                }
                                                else {
                                                    let t = moment.unix(Math.floor(row.ZLASTVISITTIME + 978307200))
                                                    browserHistory.push(
                                                        {
                                                            title: row.ZTITLE,
                                                            utc_time: t.valueOf(),
                                                            url: row.ZURL,
                                                            browser: browserName
                                                        })
                                                }
                                            }
                                        )

                                        db.close(() => {
                                            fs.unlink(newDbPath, (err) => {
                                                if (err) {
                                                    return reject(err)
                                                }
                                            })
                                            resolve(browserHistory)
                                        })
                                    })
                                }
                            )
                        })

                    })
                }
            }
        })
    }

    getSafariBasedBrowserRecords(paths, browserName, historyTimeLength) {
        let browserHistory = [],
            h = []
        return new Promise((resolve, reject) => {
            if (!paths || paths.length === 0) {
                resolve(browserHistory)
            }
            for (let i = 0; i < paths.length; i++) {
                if (paths[i] || paths[i] !== "") {

                    let newDbPath = path.join(process.env.TMP ? process.env.TMP : process.env.TMPDIR, v4() + ".db")

                    //Assuming the sqlite file is locked so lets make a copy of it
                    const originalDB = new Database(paths[i])
                    originalDB.serialize(() => {
                        // This has to be called to merge .db-wall, the in memory db, to disk so we can access the history when
                        // safari is open
                        originalDB.run("PRAGMA wal_checkpoint(FULL)")
                        originalDB.close(() => {
                            let readStream = fs.createReadStream(paths[i]),
                                writeStream = fs.createWriteStream(newDbPath),
                                stream = readStream.pipe(writeStream)

                            stream.on("finish", () => {
                                    const db = new Database(newDbPath)
                                    db.serialize(() => {
                                        db.run("PRAGMA wal_checkpoint(FULL)")
                                        db.each(
                                            "SELECT i.id, i.url, v.title, v.visit_time FROM history_items i INNER JOIN history_visits v on i.id = v.history_item WHERE DATETIME (v.visit_time + 978307200, 'unixepoch')  >= DATETIME('now', '-" +
                                            historyTimeLength + " minutes')",
                                            (err, row) => {
                                                if (err) {
                                                    reject(err)
                                                }
                                                else {
                                                    let t = moment.unix(Math.floor(row.visit_time + 978307200))
                                                    browserHistory.push(
                                                        {
                                                            title: row.title,
                                                            utc_time: t.valueOf(),
                                                            url: row.url,
                                                            browser: browserName
                                                        })
                                                }
                                            }
                                        )

                                        db.close(() => {
                                            fs.unlink(newDbPath, (err) => {
                                                if (err) {
                                                    return reject(err)
                                                }
                                            })
                                            resolve(browserHistory)
                                        })
                                    })
                                }
                            )
                        })

                    })
                }
            }
        })
    }

    getMicrosoftEdgePath(microsoftEdgePath) {
        return new Promise((resolve, reject) => {
                fs.readdir(microsoftEdgePath, (err, files) => {
                        if (err) {
                            resolve(null)
                            return
                        }
                        for (let i = 0; i < files.length; i++) {
                            if (files[i].indexOf("Microsoft.MicrosoftEdge") !== -1) {
                                microsoftEdgePath = path.join(
                                    microsoftEdgePath, files[i], "AC", "MicrosoftEdge", "User", "Default", "DataStore", "Data",
                                    "nouser1")
                                break
                            }
                        }
                        fs.readdir(microsoftEdgePath, (err2, files2) => {
                                if (err) {
                                    resolve(null)
                                }
                                //console.log(path.join(microsoftEdgePath, files2[0], "DBStore", "spartan.edb"));
                                resolve(path.join(microsoftEdgePath, files2[0], "DBStore", "spartan.edb"))
                            }
                        )
                    }
                )
            }
        )
    }

    /**
     * Gets Firefox history
     * @param historyTimeLength time is in minutes
     * @returns {Promise<array>}
     */
    // getFirefoxHistory(historyTimeLength = 5) {
    //     let getPaths = [
    //         this.browsers.findPaths(this.browsers.defaultPaths.firefox, this.browsers.FIREFOX).then(foundPaths => {
    //             // @ts-ignore
    //             this.browsers.browserDbLocations.firefox = foundPaths
    //         })
    //     ]
    //     Promise.all(getPaths).then(() => {
    //         // @ts-ignore
    //         let getRecords = [
    //             this.getBrowserHistory(this.browsers.browserDbLocations.firefox, this.browsers.FIREFOX, historyTimeLength)
    //         ]
    //         Promise.all(getRecords).then((records) => {
    //             return records
    //         }, error => {
    //             throw error
    //         })
    //     }, error => {
    //         throw error
    //     })
    // }

    /**
     * Gets Seamonkey History
     * @param historyTimeLength time is in minutes
     * @returns {Promise<array>}
     //  */
    // getSeaMonkeyHistory(historyTimeLength = 5) {
    //     let getPaths = [
    //         this.browsers.findPaths(this.browsers.defaultPaths.seamonkey, this.browsers.SEAMONKEY).then(foundPaths => {
    //             // @ts-ignore
    //             this.browsers.browserDbLocations.seamonkey = foundPaths
    //         })
    //     ]
    //     Promise.all(getPaths).then(() => {
    //         // @ts-ignore
    //         let getRecords = [
    //             this.getBrowserHistory(this.browsers.browserDbLocations.seamonkey, this.browsers.SEAMONKEY, historyTimeLength)
    //         ]
    //         Promise.all(getRecords).then((records) => {
    //             return records
    //         }, error => {
    //             throw error
    //         })
    //     }, error => {
    //         throw error
    //     })
    // }

    /**
     * Gets Chrome History
     * @param historyTimeLength time is in minutes
     * @returns {Promise<array>}
     */
    async getChromeHistory(historyTimeLength = 5) {
        const paths = this.browsers.findPaths(this.browsers.defaultPaths.chrome, this.browsers.CHROME);
        const history = await this.getBrowserHistory(paths, this.browsers.CHROME, historyTimeLength);
        return history[0];
    }

    //
    // paths.
    // let getPaths: any = null;
    //
    // const paths = await Promise.all(await Promise.all(newVar));
    //
    //
    // console.log(JSON.stringify(paths));
    //
    // Promise.all(newVar).then(res => {
    //     res.filter(promises => {
    //         Promise.all(promises).then(async promise => {
    //             const a = await promise;
    //             const b: any = a.reduce((total: any, curr: any) => {
    //                 try {
    //                     total.push(
    //                         curr.reduce((t, c) => {
    //                             if (c.toString().includes("History")) {
    //                                 t.push(c)
    //                             }
    //                             return t;
    //                         }, []));
    //                 }
    //                 catch (e) {
    //                     curr.toString().includes("History") ? total.push(curr) : undefined
    //
    //                 }
    //                 return total;
    //             }, []);
    //
    //             const c = b.map(path => path.toString()).filter(path => path.length > 0);
    //
    //             return new Promise<any>(async resolve => {
    //                 const history = await this.getBrowserHistory(c, this.browsers.CHROME, historyTimeLength);
    //                 resolve(history);
    //             });
    //
    //
    //         })
    //     })
    // Promise.all(res.pop()).then(async (resAll) => {
    //         Promise.all(resAll).then(async resone=>{
    //             console.log(JSON.stringify(resone));
    //             getPaths = [res.filter(location => (location as string).includes("History"))]
    //             let getRecords =
    //                 await this.getBrowserHistory(res, this.browsers.CHROME, historyTimeLength)
    //
    //             console.log(JSON.stringify(getRecords))
    //         });

    // Promise.all(getRecords).then((records) => {
    //     return records
    // }, error => {
    //     throw error
    // }).catch(error => {
    //     throw error
    // })
    //         }
    //     )
    // });


    // Promise.all(getPaths).then((res) => {
    //@ts-ignore

    // })
    // }

    /**
     * Get Opera History
     * @param historyTimeLength time is in minutes
     * @returns {Promise<array>}
     */
    // async getOperaHistory(historyTimeLength = 5) {
    //     let getPaths = [
    //         this.browsers.findPaths(this.browsers.defaultPaths.opera, this.browsers.OPERA).then(foundPaths => {
    //             this.browsers.browserDbLocations.opera = foundPaths
    //         })
    //     ]
    //     Promise.all(getPaths).then(() => {
    //         let getRecords = [
    //             getBrowserHistory(this.browsers.browserDbLocations.opera, this.browsers.OPERA, historyTimeLength)
    //         ]
    //         Promise.all(getRecords).then((records) => {
    //             return records
    //         }, error => {
    //             throw error
    //         })
    //     }, error => {
    //         throw error
    //     })
}

/**
 * Get Torch History
 * @param historyTimeLength time is in minutes
 * @returns {Promise<array>}
 */
// async getTorchHistory(historyTimeLength = 5) {
//     let getPaths = [
//         this.browsers.findPaths(this.browsers.defaultPaths.torch, this.browsers.TORCH).then(foundPaths => {
//             this.browsers.browserDbLocations.torch = foundPaths
//         })
//     ]
//     Promise.all(getPaths).then(() => {
//         let getRecords = [
//             getBrowserHistory(this.browsers.browserDbLocations.torch, this.browsers.TORCH, historyTimeLength)
//         ]
//         Promise.all(getRecords).then((records) => {
//             return records
//         }, error => {
//             throw error
//         })
//     }, error => {
//         throw error
//     })
// }

/**
 * Get Safari History
 * @param historyTimeLength time is in minutes
 * @returns {Promise<array>}
 //  */
// async getSafariHistory(historyTimeLength = 5) {
//     let getPaths = [
//         this.browsers.findPaths(this.browsers.defaultPaths.safari, this.browsers.SAFARI).then(foundPaths => {
//             this.browsers.browserDbLocations.safari = foundPaths
//         })
//     ]
//     Promise.all(getPaths).then(() => {
//         let getRecords = [
//             getBrowserHistory(this.browsers.browserDbLocations.safari, this.browsers.SAFARI, historyTimeLength)
//         ]
//         Promise.all(getRecords).then((records) => {
//             return records
//         }, error => {
//             throw error
//         })
//     }, error => {
//         throw error
//     })
// }

/**
 * Get Maxthon History
 * @param historyTimeLength time is in minutes
 //  * @returns {Promise<array>}
 //  */
// async getMaxthonHistory(historyTimeLength = 5) {
//     let getPaths = [
//         this.browsers.findPaths(this.browsers.defaultPaths.maxthon, this.browsers.MAXTHON).then(foundPaths => {
//             this.browsers.browserDbLocations.maxthon = foundPaths
//         })
//     ]
//     Promise.all(getPaths).then(() => {
//         let getRecords = [
//             getBrowserHistory(this.browsers.browserDbLocations.maxthon, this.browsers.MAXTHON, historyTimeLength)
//         ]
//         Promise.all(getRecords).then((records) => {
//             return records
//         }, error => {
//             throw error
//         })
//     }, error => {
//         throw error
//     })
// }

/**
 * Get Vivaldi History
 * @param historyTimeLength time is in minutes
 * @returns {Promise<array>}
 */
// async getVivaldiHistory(historyTimeLength = 5) {
//     let getPaths = [
//         this.browsers.findPaths(this.browsers.defaultPaths.vivaldi, this.browsers.VIVALDI).then(foundPaths => {
//             this.browsers.browserDbLocations.vivaldi = foundPaths
//         })
//     ]
//     Promise.all(getPaths).then(() => {
//         let getRecords = [
//             getBrowserHistory(this.browsers.browserDbLocations.vivaldi, this.browsers.VIVALDI, historyTimeLength)
//         ]
//         Promise.all(getRecords).then((records) => {
//             return records
//         }, error => {
//             throw error
//         })
//     }, error => {
//         throw error
//     })
// }

/**
 * Get Internet Explorer History
 * @param historyTimeLength time is in minutes
 * @returns {Promise<array>}
 //  */
// async getIEHistory(historyTimeLength = 5) {
//     let getRecords = [
//         getBrowserHistory([], this.browsers.INTERNETEXPLORER, historyTimeLength)
//     ]
//     Promise.all(getRecords).then((records) => {
//         return records
//     }, error => {
//         throw error
//     })
// }

/**
 * Gets the history for the Specified this.browsers and time in minutes.
 * Returns an array of browser records.
 * @param historyTimeLength | Integer
 * @returns {Promise<array>}
 */
// async getAllHistory(historyTimeLength = 5) {
//     let allBrowserRecords = []
//
//     this.browsers.browserDbLocations.firefox = this.browsers.findPaths(this.browsers.defaultPaths.firefox, this.browsers.FIREFOX)
//     this.browsers.browserDbLocations.chrome = this.browsers.findPaths(this.browsers.defaultPaths.chrome, this.browsers.CHROME)
//     this.browsers.browserDbLocations.seamonkey = this.browsers.findPaths(this.browsers.defaultPaths.seamonkey, this.browsers.SEAMONKEY)
//     this.browsers.browserDbLocations.opera = this.browsers.findPaths(this.browsers.defaultPaths.opera, this.browsers.OPERA)
//     this.browsers.browserDbLocations.torch = this.browsers.findPaths(this.browsers.defaultPaths.torch, this.browsers.TORCH)
//     this.browsers.browserDbLocations.safari = this.browsers.findPaths(this.browsers.defaultPaths.safari, this.browsers.SAFARI)
//     this.browsers.browserDbLocations.seamonkey = this.browsers.findPaths(this.browsers.defaultPaths.seamonkey, this.browsers.SEAMONKEY)
//     this.browsers.browserDbLocations.maxthon = this.browsers.findPaths(this.browsers.defaultPaths.maxthon, this.browsers.MAXTHON)
//     this.browsers.browserDbLocations.vivaldi = this.browsers.findPaths(this.browsers.defaultPaths.vivaldi, this.browsers.VIVALDI)
//
//     allBrowserRecords = allBrowserRecords.concat(await getBrowserHistory(this.browsers.browserDbLocations.firefox, this.browsers.FIREFOX, historyTimeLength))
//     allBrowserRecords = allBrowserRecords.concat(await getBrowserHistory(this.browsers.browserDbLocations.seamonkey, this.browsers.SEAMONKEY, historyTimeLength))
//     allBrowserRecords = allBrowserRecords.concat(await getBrowserHistory(this.browsers.browserDbLocations.chrome, this.browsers.CHROME, historyTimeLength))
//     allBrowserRecords = allBrowserRecords.concat(await getBrowserHistory(this.browsers.browserDbLocations.opera, this.browsers.OPERA, historyTimeLength))
//     allBrowserRecords = allBrowserRecords.concat(await getBrowserHistory(this.browsers.browserDbLocations.torch, this.browsers.TORCH, historyTimeLength))
//     allBrowserRecords = allBrowserRecords.concat(await getBrowserHistory(this.browsers.browserDbLocations.safari, this.browsers.SAFARI, historyTimeLength))
//     allBrowserRecords = allBrowserRecords.concat(await getBrowserHistory(this.browsers.browserDbLocations.vivaldi, this.browsers.VIVALDI, historyTimeLength))
//     allBrowserRecords = allBrowserRecords.concat(await getBrowserHistory(this.browsers.browserDbLocations.seamonkey, this.browsers.SEAMONKEY, historyTimeLength))
//     allBrowserRecords = allBrowserRecords.concat(await getBrowserHistory(this.browsers.browserDbLocations.maxthon, this.browsers.MAXTHON, historyTimeLength))
//     //No Path because this is handled by the dll
//     allBrowserRecords = allBrowserRecords.concat(await getBrowserHistory([], this.browsers.INTERNETEXPLORER, historyTimeLength))
//
//     return allBrowserRecords
// }



