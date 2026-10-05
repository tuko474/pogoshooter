# Рисует иконку и заставку в assets/ (запуск: python3 tools/make_icon.py, нужен Pillow).
from PIL import Image, ImageDraw
NIGHT=(20,26,58); DUSK=(42,36,102); SPRING=(62,230,181); CORAL=(255,107,74); MUSTARD=(255,201,60); INK=(244,242,255); MUTED=(169,166,214)

def bg(size):
    im=Image.new('RGB',(size,size),NIGHT); d=ImageDraw.Draw(im)
    for y in range(size):
        k=y/size; d.line([(0,y),(size,y)],fill=tuple(int(NIGHT[i]+(DUSK[i]-NIGHT[i])*k) for i in range(3)))
    return im

def hero(d,cx,cy,s):
    # пружина
    top=cy-0.05*s; bot=cy+0.33*s; pts=[(cx,bot)]
    for i in range(1,7): pts.append((cx+(0.06*s if i%2 else -0.06*s), bot-(bot-top)*i/7))
    pts.append((cx,top)); d.line(pts,fill=MUTED,width=int(0.03*s),joint='curve')
    d.rectangle([cx-0.11*s,top-0.02*s,cx+0.11*s,top+0.025*s],fill=INK)
    d.ellipse([cx-0.035*s,bot-0.035*s,cx+0.035*s,bot+0.035*s],fill=CORAL)
    r=0.17*s; by=top-0.13*s
    d.ellipse([cx-r,by-r,cx+r,by+r],fill=SPRING)
    for ex in (0.01,0.1): d.ellipse([cx+ex*s-0.03*s,by-0.07*s,cx+ex*s+0.03*s,by-0.01*s],fill=NIGHT)
    d.rectangle([cx+0.11*s,by+0.02*s,cx+0.23*s,by+0.075*s],fill=NIGHT)
    # пули
    for i,(x,y) in enumerate([(0.3,-0.12),(0.38,-0.2)]):
        d.ellipse([cx+x*s-0.03*s,by+y*s-0.03*s,cx+x*s+0.03*s,by+y*s+0.03*s],fill=MUSTARD)

S=1024
im=bg(S); d=ImageDraw.Draw(im)
d.rectangle([0,int(S*0.86),S,S],fill=(199,134,28)); d.rectangle([0,int(S*0.86),S,int(S*0.875)],fill=MUSTARD)
hero(d,S*0.45,S*0.52,S); im.save('assets/icon-only.png')
bg(S).save('assets/icon-background.png')
fg=Image.new('RGBA',(S,S),(0,0,0,0)); hero(ImageDraw.Draw(fg),S*0.45,S*0.52,S*0.62); fg.save('assets/icon-foreground.png')
sp=bg(2732); hero(ImageDraw.Draw(sp),2732*0.48,2732*0.5,1200); sp.save('assets/splash.png'); sp.save('assets/splash-dark.png')
print('ok')
