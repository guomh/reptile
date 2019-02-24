/**
 * Created by guominghui on 18/3/12.
 */
const puppeteer = require( 'puppeteer' );
const fs = require( 'fs' );
const xlsx = require('node-xlsx').default;
const table = [];
let beginTime ;
let endTime ;
let args = process.argv.splice(2);
if(args.length ==1){
  beginTime = args[0];
  endTime = null;
}else if(args.length == 2){
  beginTime = args[0];
  endTime = args[1];
}else{
  beginTime = null;
  endTime = null;
}



( async () => {
  const browser = await puppeteer.launch({
    headless: false
  });
  let idlist;
  try{
    idlist = await getIdlist(beginTime,endTime,browser)
  }catch(e){
    console.log(11,e)
  }

  console.log(idlist)
  const result = [];
  let a = Date.now();
  for(let i = 0,l=idlist.length;i<l;i++){
    let msg
    try{
      msg = await getMsg(idlist[i],browser);
    }catch(e){
      console.log(e)
    }

    result.push(msg)
  }
  let b = Date.now()
  console.log(b - a);
  await browser.close();
  toExcel(result);
} )();

async function getIdlist(beginTime,endTime,browser) {
  let idlist = [];
  let host = 'http://58.215.18.122:8090/for12345/Statistics/CaseStatistics?title=成员单位工单查询';
  const page = await browser.newPage();

  page.on( 'console', msg => {
    for ( let i = 0; i < msg.args().length; ++i )
      console.log( `${i}: ${msg.args()[i]}` );
  } );
  page.setViewport( {
    width: 1960,
    height: 2000
  } );
  let value = JSON.stringify( {
    "L": "swljt01",
    "P": "caea37f434d77806c62102b3331ecf77",
    "R": "11",
    "RN": "%e4%ba%8c%e7%ba%a7%e5%8d%95%e4%bd%8d",
    "K": ""
  } )

  await page.setCookie( {
    name: 'user',
    value: value,
    domain: '58.215.18.122',
    url: host
  } )
  // await page.setCookie( {
  //   name: 'ASP.NET_SessionId',
  //   value: 'qe5blhz5mjryhuuwjr1um4bi',
  //   domain: '58.215.18.122',
  //   url: host
  // } )

    await page.goto( host );

    let idObj = await getIdByPage(page,1,beginTime,endTime)
    idlist = idlist.concat(idObj.idlist)
    if(idObj.index < idObj.total){
      let index = idObj.index +1;
      for(;index<=idObj.total;index++){
        let obj = await getIdByPage(page,index,beginTime,endTime)
        idlist = idlist.concat(obj.idlist)
      }
    }
    console.log(idlist.length,idObj.records)
    idlist.reverse()
    await page.close();
    return Promise.resolve( idlist );
}

async function getIdByPage(page,index,beginTime,endTime){
  return page.evaluate( (index,beginTime,endTime) => {
    function getId(index = 1,beginTime,endTime) {
      return new Promise( ( resolve, reject ) => {
        let idlist = [];
        let obj = {
          flowState: 0,
          sourceType: 0,
          appealType: 0,
          NetType: 0,
          caseType: 0,
          serviceType: 0,
          pageIndex: index,
          zhubanDep: '001054'
        }
        if(beginTime){
          obj.beginTime = beginTime;
        }
        if(endTime){
          obj.endTime = endTime;
        }
        getAjaxJson("/Case/GetList?type=" + '101', obj, function(data) {
          if(data && data.rows && data.rows.length){
            for(let i=0,l=data.rows.length;i<l;i++){
              id = data.rows[i].casecodeid;
              idlist.push(id);
            }
            resolve({idlist,total:data.total,index:data.page,records:data.records});
          }
        })

      } )
    }
    return getId(index,beginTime,endTime)
  } ,index,beginTime,endTime);
}

function toExcel(list){
  let data = []
  let head = ['工单编号','下单时间','标题','问题描述','主办单位','集团申请办结处理意见','基层申请办结处理意见','办结处理意见','工单来源','业务类别']
  data.push(head);
  for(let i=0,l=list.length;i<l;i++){
    let d = [];
    let item = list[i];
    d.push(item.id);
    d.push(item.time);
    d.push(item.contextTitle);
    d.push(item.context);
    d.push(item.main);
    d.push(item.applymsg_main);
    d.push(item.applymsg_sub);
    d.push(item.replymsg);
    d.push(item.source);
    d.push(item.lb);
    data.push(d);
  }
  var buffer = xlsx.build([{name: "mySheetName", data: data}]);
  fs.writeFile('./message.xlsx', buffer,function(err){
      if(err) console.log('写文件操作失败');
      else console.log('写文件操作成功');
  });
}

async function getMsg( id, browser ) {
  const page = await browser.newPage();
  page.on( 'console', msg => {
    for ( let i = 0; i < msg.args().length; ++i )
      console.log( `${i}: ${msg.args()[i]}` );
  } );
  let url = 'http://58.215.18.122:8090/for12345/Case/CaseDetail?id=';
  url = url + id;
  await page.goto( url );

  // Get the "viewport" of the page, as reported by the page.
  const result = await page.evaluate( () => {
    return new Promise( ( resolve, reject ) => {
      let table = document.querySelectorAll( '#infoTable tr' );
      let context = '';
      let main = '';
      let source = '';
      let contextTitle = '';
      let lb = '';
      for ( var i = 0, l = table.length; i < l; i++ ) {
        let tr = table[ i ];
        let title = tr.querySelector( 'td:nth-of-type(1)' ).innerHTML.trim();
        if ( title == '问题描述' ) {
          context = tr.querySelector( 'td:nth-of-type(2)' ).innerHTML.trim();
        } else if ( title == '标题' ) {
          contextTitle = tr.querySelector( 'td:nth-of-type(2)' ).innerHTML.trim();
        } else if ( title == '主办单位' ) {
          main = tr.querySelector( 'td:nth-of-type(2)' ).innerHTML.trim();
        } else if ( title == '工单来源' ) {
          source = tr.querySelector( 'td:nth-of-type(2)' ).innerHTML.trim();
          lb = tr.querySelector( 'td:nth-of-type(4)' ).innerHTML.trim();
        }
      }
      let time = table[ 0 ].querySelector( 'td:nth-of-type(4)' ).innerHTML.trim();
      // let context = table.querySelector('tr:nth-of-type(6) td:nth-of-type(2)').innerHTML.trim();
      // let main = table.querySelector('tr:nth-of-type(8) td:nth-of-type(2)').innerHTML.trim();
      let trlist = document.querySelectorAll( '#descBody tr' );
      let applymsg_main = '';
      let applymsg_sub = '';
      let replymsg = '';
      if ( trlist ) {
        for ( var i = 0, l = trlist.length; i < l; i++ ) {
          let tr = trlist[ i ];
          let type = tr.querySelector( 'td:nth-of-type(3)' ).innerHTML.trim();
          if ( type == '申请办结' ) {
            let group = tr.querySelector( 'td:nth-of-type(1)' ).innerHTML.trim();
            if(group == '市文旅集团'){
              applymsg_main = tr.querySelector( 'td:nth-of-type(6)' ).innerHTML.trim();
            }else{
              applymsg_sub = tr.querySelector( 'td:nth-of-type(6)' ).innerHTML.trim();
            }

          }
          if ( !replymsg ) {
            if ( type == '办结' || type =='话务员办结' ) {
              replymsg = tr.querySelector( 'td:nth-of-type(6)' ).innerHTML.trim();
            }
          }

        }
      }


      resolve( {
        context,
        contextTitle,
        main,
        applymsg_sub,
        applymsg_main,
        replymsg,
        source,
        time,
        lb
      } )
    } )
  } );
  await page.close();
  result.id = id;
  return Promise.resolve( result );
}
