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
        return new Promise(async res => {
          const hist =  await history.getChromeHistory(5)
            console.log("done");
            console.log(JSON.stringify(hist))

        })
    }


}
//

const test = new Test()
test.testGetChromeOnly()

// setInterval(()=>{
//   testGetAllHistory();
// },2000)




