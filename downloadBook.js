/**
 * Created by guominghui on 18/3/12.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const request = require('request');
let args = process.argv.splice(2);
let filename ='';
if(args.length<1){
    console.log('please input url. eg. node downloadBoos https://manhua.dmzj.com/yiquanchaoren/58682.shtml');
    return;
}else if(args.length ==2){
    filename = args[1]+'/';
}

(async () => {
    const browser = await puppeteer.launch();
   //let host = 'https://manhua.dmzj.com/yiquanchaoren/';
   // let bookhost = host+'58682.shtml';
    let bookhost = args[0];
    let n = 1;
    while(true){
        try{
            bookhost = await getBook(browser,bookhost,n<10?'0'+n:n);
            n++;
            console.log(bookhost);
        }catch(e){
            console.log(e);
            console.log('all down');
            break;
        }
    }
    await browser.close();

})();

async function getBook(browser,url,no){
    let host = url+'#@page=';
    if(!fs.existsSync('./'+filename)){
        fs.mkdirSync('./'+filename);
    }
    if(!fs.existsSync('./'+filename+no)){
        fs.mkdirSync('./'+filename+no);
    }

    let nums =await getTotal(browser,host);
   // nums=1;
    for(var i=1;i<=nums;i++){
        let src = await newP(browser,host,i);
        download(src,'./'+filename+no+'/'+i+'.jpg',host);
        if(i == nums){
            try{
                var nexturl = await getNext(browser,url);
                return Promise.resolve(nexturl);
            }catch(e){
                return Promise.reject(e);
            }

        }
    }
}

async function getTotal(browser,url){
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    url = url+'1';
    await page.goto(url);

    // Get the "viewport" of the page, as reported by the page.
    const dimensions = await page.evaluate(() => {
        /*var nums = document.querySelector('#page_select option');
         if(nums){
         console.log(nums);
         }
         return nums;*/
        return new Promise((resolve,reject) =>{
            var result = {};
            setInterval(()=>{
                if(!result.nums){
                    var nums = document.querySelectorAll('#page_select option').length;
                    if(nums){
                        result.nums = nums;
                    }
                }

                if(result.nums){
                    resolve(result);
                }
            },10)
        })
    });
    await page.close();
    return Promise.resolve(dimensions.nums);
}

async function getNext(browser,url){
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.goto(url);
    // Get the "viewport" of the page, as reported by the page.
    try{
        const dimensions = await page.evaluate(() => {
            var n =0;
            /*return new Promise((resolve,reject) =>{
             setInterval(()=>{
             var href = document.querySelector('#next_chapter').href;
             console.log(href,n);
             if(href){
             resolve(href);
             }else{
             n++;
             if(n>=1000){
             console.log('no more');
             reject('no more');
             }
             }
             },10)
             })*/
            return new Promise((resolve,reject) =>{
                var dom = document.querySelector('#next_chapter');
                if(dom){
                    resolve(dom.href);
                }else{
                    console.log('no more');
                    reject('no more');
                }
            })
        });
        await page.close();
        return Promise.resolve(dimensions);
    }catch(e){
        await page.close();
        return Promise.reject(e);
    }

}

async function newP(browser,url,index){
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    url = url+index;
    await page.goto(url);

    // Get the "viewport" of the page, as reported by the page.
    const dimensions = await page.evaluate(() => {
        /*var nums = document.querySelector('#page_select option');
         if(nums){
         console.log(nums);
         }
         return nums;*/
        return new Promise((resolve,reject) =>{
            var result = {};
            setInterval(()=>{
                if(!result.src){
                    let src = document.querySelector('#center_box img').src;
                    if(src){
                        result.src = src;
                    }
                }
                if(result.src){
                    resolve(result);
                }
            },300)
        })
    });
    await page.close();
    return Promise.resolve(dimensions.src);
    //return download(dimensions.src,'./'+index+'.jpg',url);
}

function download(src,dest,referer){
    return new Promise((resolve,reject) =>{
        request({
            url:src,
            headers:{
                referer:referer
            }
        }).pipe(fs.createWriteStream(dest)).on('close',function(){
            console.log(dest+ ' saved!');
            resolve();
        })
    })
}