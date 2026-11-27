"""Check the six original doors from the harbor and assemble each day's WebGL review sheet."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
from playwright.sync_api import sync_playwright

cli=argparse.ArgumentParser()
cli.add_argument('--day', choices=['0102','0103','0104','0105','0106','0107','0108','0109','0110']+[str(d) for d in range(1202,1232)], required=True)
cli.add_argument('--base', default='http://127.0.0.1:5190')
cli.add_argument('--sheet', action='store_true')
opt=cli.parse_args()
day=opt.day
batch='janweek-six' if '0106'<=day<='0110' else 'newyear-six' if day.startswith('01') else 'monthend-six' if day>='1222' else 'yearend-six' if day>='1217' else 'midwinter-six' if day>='1212' else 'winter-six' if day>='1207' else 'dec-six'
out=Path(__file__).resolve().parents[1]/'qa'/'evidence'
modes=['first','second','defense','match','skirmish','rpg']
catalog=json.loads((out.parents[1]/'docs'/'level-catalog.json').read_text('utf8'))['days']
def harbor():
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
        ctx=browser.new_context(viewport={'width':920,'height':600})
        ctx.add_init_script("""Element.prototype.requestPointerLock=()=>Promise.resolve();
          if(!localStorage.getItem('slimefable.web.save.v1'))localStorage.setItem('slimefable.web.save.v1',
          JSON.stringify({v:1,quality:'low',souvenirs:['0101-1864'],life:{coins:41,records:{legacy:7}}}));""")
        ctx.route_web_socket('**/*',lambda socket:None)
        page=ctx.new_page();page.set_default_timeout(90000)
        errors=[];rows={}
        page.on('pageerror',lambda exc:errors.append(str(exc)))
        def arrive():
            page.wait_for_function("window.__slime?.ready && ['play','title'].includes(window.__game?.state)")
            if page.evaluate("__game.state==='title'"):page.locator('[data-act=start]:visible').first.click()
            page.wait_for_function("__game.state==='play'")
        page.goto(opt.base+'/?date='+day);arrive()
        stories=[chapter['id'] for chapter in catalog[day]['chapters'] if chapter['playPath']]
        visits=[(min(i,1),key) for i,key in enumerate(stories)]+[(i+2,day+'-'+mode) for i,mode in enumerate(modes[2:])]
        ids=[key for _,key in visits]
        assert len(set(ids))==len(ids) and {slot for slot,_ in visits}==set(range(6)),(day,visits)
        page.keyboard.press('j')
        page.wait_for_function("__game.state==='book'")
        for key in ids:assert page.locator('.book [data-act=go][data-id="'+key+'"]').count()==1,key
        page.locator('[data-act=close]:visible').first.click()
        def visit_and_return(key,slot):
            page.wait_for_url('**/level.html?id='+key)
            page.wait_for_function('window.__slime?.latest?.count>100')
            home=page.locator('[data-home]:visible,[data-do=home]:visible,[data-act=home]:visible')
            if not home.count() and page.locator('[data-pause]:visible').count():
                page.locator('[data-pause]:visible').first.click()
            home.first.click();arrive()
            dist=page.evaluate('i=>{const p=__game.portals[i].slot.position,a=__slime.position;return Math.hypot(a[0]-p[0],a[2]-p[2]);}',slot)
            assert dist<3.5 and page.evaluate('__game.showing.shown.day')==day
            return round(dist,2)
        for i,key in visits:
            page.evaluate('i=>{__game.doorLatch.clear();__slime.teleport([...__game.portals[i].slot.position])}',i)
            # A single-story door opens directly. Multi-item doors keep the selection panel.
            page.wait_for_function("location.pathname.endsWith('level.html') || window.__game?.state==='door' || window.__game?.departing")
            if page.url.split('?')[0].endswith('/') and (i==1 and len(stories)>2 or page.locator('.door [data-act=go][data-id="'+key+'"]:visible').count()):
                page.locator('.door [data-act=go][data-id="'+key+'"]').click()
            distance=visit_and_return(key,i)
            page.keyboard.press('j')
            page.locator('.book [data-act=go][data-id="'+key+'"]').click()
            book_distance=visit_and_return(key,i)
            print(day,key,'door + book OK',flush=True)
            rows[key]={'slot':i+1,'book':True,'returnDistance':distance,'bookReturnDistance':book_distance}
        assert page.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('slimefable.web.save.v1'));
            return s.souvenirs.includes('0101-1864') && s.life.records.legacy===7 && s.life.coins===41;}""")
        assert not errors,errors
        (out/f'{batch}-{day}-harbor.json').write_text(json.dumps(rows,indent=2),'utf-8')
        print(day,rows,flush=True);browser.close()

def sheet():
    labels={'0102':['显微合画','月边留迹','两岸会船','展馆回声','网格留尘','压哨射门','守灯渡页'],
            '0103':['窗光配色','字林拓图','月背接应','极光成翼','海湾补图','卷纸成管'],
            '0104':['手稿续墨','梯顶观景','凸点装书','藤尖上架','松罩下坡','星风成弧'],
            '0105':['杠杆配重','两岸牵线','冰巷亮灯','街角取景','眨眼辨星','雪地调平'],
            '0106':['双栏校稿','滚出点划','邮驿留星','合拢海岸','纹砂双样','彗雪曝光'],
            '0107':['系船接轨','沿水取样','白崖交风','船窗掠影','留灯寻月','猫眼叠环'],
            '0108':['研磨走墨','岛影成册','卡孔计数','拉紧琴弦','旋臂留光','粉线合围'],
            '0109':['三点测星','银版曝光','三路同亮','穿织纸结','松缆升空','盔云合弧'],
            '0110':['点亮接线图','称信入袋','隧道发车','折痕立城','分身稳吊','翻出分镜'],
            '1202':['压戳分信','卷纸留签','双塔接灯','抽托转铲','留灯过街','背风展瓣'],
            '1203':['移片调焦','点阵拼字','隧道放行','解锁升空','两门测速','横扫云带'],
            '1204':['收骨升灯','放坡出车','扫灯寻伞','交叉合光','拨珠换五','止旋锁舱'],
            '1205':['托木合拱','连帧飞鸟','回执过桥','照单配货','双星接应','听冰开航'],
            '1206':['移步取景','刻音回放','合爪接样','支护横掘','沿湾引光','绕鼓落冠'],
            '1207':['讲页叠影','绕木观测','星站回传','双车交班','船站回执','舷窗摄影'],
            '1208':['接通月背','系牢浮圈','三角测高','黄河合龙','蓄光点窗','双册合印'],
            '1209':['街巷展签','超文本开窗','水门迎机','双级展轨','两舷布星','纸带译读'],
            '1210':['高粱取景','倾盘停章','双星交守','诺奖装订','停在四百','孔卡织纹'],
            '1211':['候潮交单','圆窗对图','云图描电','归航装箱','压载过桥','称重封箱'],
            '1212':['合页鸣钟','听取三点','分渠通水','气候合页','交接工位','扫出星源'],
            '1213':['护烛放鹤','雾中辨山','掠星取景','携样归航','沙路传灯','筛选月壤'],
            '1214':['嵌字立匾','极昼定点','月尘接陆','围堰导流','迎接归程','逐份成谱'],
            '1215':['合闸亮窗','轨道交会','月面互拍','三路直达','合罩展件','寻回舱讯'],
            '1216':['双栏合印','炉边封信','双星入网','峰林通车','星灯组网','三站覆盖'],
            '1217':['圆场牵船','木轨托翼','追读两跳','贯穿晶条','挂钩穿旗','灯影寻钩'],
            '1218':['水尺开闸','唱片发声','夹印装订','样格合册','双轴展墙','地球叠片'],
            '1219':['天平交盒','三窗鸣钟','封签交接','开市鸣锣','脉冲留墨','双镜合星'],
            '1220':['潮纹开莲','四灯合亮','三站分图','机组通水','双环托匣','沿窗取景'],
            '1221':['星弧相交','舷窗取景','晴空样带','逐铰展翼','留刻量影','分层推片'],
            '1222':['拓纹入册','风箱合奏','看旗出票','并框双照','纸带对读','点阵成窗'],
            '1223':['复桥合拱','晶针显波','安顿双熊','双层星架','车窗串景','拼环球图'],
            '1224':['校样装订','定影地出','浅湾浮标','邮轮亮窗','极地供能','雨林封签'],
            '1225':['电报收讫','镜瓣聚星','两路交票','山水折页','四签归柜','折光配色'],
            '1226':['排韵压纸','暗柜辨光','站序行李','双线接驳','三城票签','逐位进位'],
            '1227':['渠首分水','甲板写生','纪念灯序','沙盘指路','手稿星图','等时扫弧'],
            '1228':['戏台定格','摇柄开映','山中邮袋','收集光斑','冰带系灯','拼共享图'],
            '1229':['验票入匣','晶格留影','桥灯接电','地形合印','双列测速','比较回弹'],
            '1230':['窑洞回声','星岛测距','温标归夹','共量京张','双星换片','循迹翻书'],
            '1231':['冰原奠基','钟球落稳','悬浮入站','沿线暖窗','岁末路图','百灯迎年']}
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',20)
    title=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',26)
    panels=[*modes[:2],'extra',*modes[2:]] if day=='0102' else modes
    canvas=Image.new('RGB',(10+305*len(panels),705),'#223035');g=ImageDraw.Draw(canvas)
    g.text((20,10),f'{int(day[:2])} 月 {int(day[2:])} 日   /   六扇门',font=title,fill='#f5e5c7')
    for slot,mode in enumerate(panels):
        prefix=f'{batch}-{day}-{mode}-'
        proof=json.loads((out/(prefix+'result.json')).read_text('utf-8-sig'))
        assert proof.get('daily',proof.get('completed')) and proof.get('practice'),prefix
        for view in ['play','low','far','portrait','final']:
            file=out/(prefix+view+'.jpg')
            with Image.open(file) as shot:
                extrema=shot.convert('L').getextrema()
                assert extrema[1]-extrema[0]>40,file
                if view=='portrait':assert shot.height>shot.width,file
        x=10+305*slot
        g.text((x+4,57),(('2 · 选章' if mode=='extra' else str(modes.index(mode)+1))+'  '+labels[day][6 if mode=='extra' else modes.index(mode)]),font=font,fill='#f4d6a6')
        for tag,y,h in [('play',94,174),('far',276,171),('final',455,210)]:
            with Image.open(out/(prefix+tag+'.jpg')) as source:
                if tag=='far' and source.height>source.width:
                    source=source.crop((0,source.height//2,source.width,source.height))
                frame=ImageOps.contain(source.convert('RGB'),(295,h))
                canvas.paste(frame,(x+(295-frame.width)//2,y+(h-frame.height)//2))
    canvas.save(out/f'{batch}-{day}.jpg',quality=90,optimize=True)

if opt.sheet:sheet()
else:harbor()
