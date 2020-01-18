//  declare  function require(arg:any):any
import {Runner} from './Runner';
const history = new Runner();
class Test {

    // / function testGetAllHistory () {
//   console.log('***** RUNNING GET ALL HISTORY TEST *****')
//   return new Promise(res => {
//       //@ts-ignore
//     history.getAllHistory(10).then(history => {
//       console.log('PASS GET ALL HISTORY')
//       console.log(history)
//       res(history)
//     }, error => {
//       console.log('***** FAILED TO GET ALL HISTORY *****')
//       throw (error)
//     })
//   })
// }

     testGetChromeOnly()  {
        console.log('***** RUNNING GET CHROME ONLY *****')
        return new Promise(res => {
            history.getChromeHistory(5).then(history => {
                console.log('PASS GET CHROME ONLY')
                console.log(history)
                res(history)
            }, error => {
                console.log('***** FAIL TO GET CHROME ONLY *****')
                throw (error)
            })
        })
    }


}
//

const test = new Test()
test.testGetChromeOnly()

// setInterval(()=>{
//   testGetAllHistory();
// },2000)




