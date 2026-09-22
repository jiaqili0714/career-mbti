export function getShareText(result){
  return `我在公司里进化成了「${result.name}（${result.type}）」\n${result.verdict}\n28 道职场情境，看看公司到底把你养成了什么东西。\n`;
}

export function getShareUrl(url=window.location.href){
  const clean=new URL(url);
  clean.hash='';
  return clean.toString();
}

export function getXShareUrl(result,url){
  const text=`我在公司里进化成了「${result.name}（${result.type}）」\n${result.verdict}\n28 道题，看看公司把你养成了什么东西。 #职场异变图鉴`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

function loadImage(src){
  return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
}

function wrapText(context,text,x,y,maxWidth,lineHeight,maxLines=3){
  const characters=[...text];let line='';let row=0;
  for(let index=0;index<characters.length;index++){
    const test=`${line}${characters[index]}`;
    if(context.measureText(test).width>maxWidth&&line){
      context.fillText(line,x,y+row*lineHeight);line=characters[index];row++;
      if(row===maxLines-1){line=`${line}${characters.slice(index+1).join('')}`;while(context.measureText(`${line}…`).width>maxWidth)line=line.slice(0,-1);context.fillText(`${line}…`,x,y+row*lineHeight);return;}
    }else line=test;
  }
  context.fillText(line,x,y+row*lineHeight);
}

export async function createResultCard(result){
  await document.fonts?.ready;
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
  const context=canvas.getContext('2d');
  context.fillStyle='#edf3f1';context.fillRect(0,0,1080,1350);
  context.fillStyle='#174b73';context.fillRect(0,0,1080,150);
  context.fillStyle='#d8f4ef';context.fillRect(55,195,970,1095);
  context.strokeStyle='#7298a8';context.lineWidth=4;context.strokeRect(55,195,970,1095);
  context.fillStyle='#ec5a4f';context.fillRect(735,55,280,48);
  context.fillStyle='#f2fbf8';context.font='700 58px "ZCOOL QingKe HuangYou", sans-serif';context.fillText('职场异变图鉴',65,98);
  context.font='700 24px sans-serif';context.fillText('本测试不改善命运，只负责命名。',65,132);

  const portraits=await loadImage('/assets/mbti-portraits.webp');
  const sourceWidth=portraits.naturalWidth/4;const sourceHeight=portraits.naturalHeight/4;
  const sourceX=(result.index%4)*sourceWidth;const sourceY=Math.floor(result.index/4)*sourceHeight;
  context.imageSmoothingEnabled=false;
  context.drawImage(portraits,sourceX,sourceY,sourceWidth,sourceHeight,115,260,380,380);
  context.strokeStyle='#174b73';context.lineWidth=6;context.strokeRect(115,260,380,380);

  context.fillStyle='#0d355d';context.font='700 34px sans-serif';context.fillText('异常员工档案',555,300);
  context.font='700 78px "ZCOOL QingKe HuangYou", sans-serif';context.fillText(result.name,555,400);
  context.fillStyle='#174b73';context.fillRect(555,430,170,62);
  context.fillStyle='#f2fbf8';context.font='700 34px sans-serif';context.fillText(result.type,595,473);
  context.fillStyle='#0d355d';context.font='600 29px sans-serif';wrapText(context,result.verdict,555,545,390,48,3);

  const blocks=[['你靠什么活下来',result.survival],['公司如何使用你',result.usedBy],['最容易在哪里耗尽',result.drain]];
  blocks.forEach(([label,value],index)=>{
    const y=720+index*155;
    context.fillStyle=index===2?'#f3dfd8':'#f6faf6';context.fillRect(115,y,850,125);
    context.strokeStyle='#9db8c5';context.lineWidth=2;context.strokeRect(115,y,850,125);
    context.fillStyle='#648098';context.font='600 22px sans-serif';context.fillText(label,145,y+36);
    context.fillStyle='#0d355d';context.font='600 27px sans-serif';wrapText(context,value,145,y+78,780,38,2);
  });
  context.fillStyle='#0d355d';context.font='700 23px sans-serif';context.fillText('扫码这一步已被流程优化：直接打开链接测试。',115,1238);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('无法生成分享海报')),'image/png'));
}
