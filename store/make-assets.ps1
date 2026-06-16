# Generates Chrome Web Store visuals for FloatTube into store/assets/
#   - promo-440x280.png        (small promo tile)
#   - screenshot-1..5 (1280x800)
# Run:  pwsh ./store/make-assets.ps1
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "store\assets"
New-Item -ItemType Directory -Force $out | Out-Null

# ---- palette ----
function C([int]$r,[int]$g,[int]$b,[int]$a=255){ [System.Drawing.Color]::FromArgb($a,$r,$g,$b) }
$RED    = C 255 0 51
$RED2   = C 255 59 92
$PURP   = C 120 0 255
$BG0    = C 14 14 16
$BG1    = C 24 24 30
$CARD   = C 255 255 255 14
$CARDB  = C 255 255 255 22
$TXT    = C 243 243 243
$MUT    = C 154 154 154
$GREEN  = C 94 220 126
$YELLOW = C 240 173 78

# ---- helpers ----
function NewBmp([int]$w,[int]$h){
  $bmp = New-Object System.Drawing.Bitmap($w,$h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'ClearTypeGridFit'
  $g.InterpolationMode = 'HighQualityBicubic'
  return @($bmp,$g)
}
function RoundPath([single]$x,[single]$y,[single]$w,[single]$h,[single]$r){
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r*2
  $p.AddArc($x,$y,$d,$d,180,90)
  $p.AddArc($x+$w-$d,$y,$d,$d,270,90)
  $p.AddArc($x+$w-$d,$y+$h-$d,$d,$d,0,90)
  $p.AddArc($x,$y+$h-$d,$d,$d,90,90)
  $p.CloseFigure()
  return $p
}
function FillRound($g,$col,[single]$x,[single]$y,[single]$w,[single]$h,[single]$r){
  $p = RoundPath $x $y $w $h $r
  $b = New-Object System.Drawing.SolidBrush $col
  $g.FillPath($b,$p); $b.Dispose(); $p.Dispose()
}
function StrokeRound($g,$col,[single]$x,[single]$y,[single]$w,[single]$h,[single]$r,[single]$tw=1){
  $p = RoundPath $x $y $w $h $r
  $pen = New-Object System.Drawing.Pen($col,$tw)
  $g.DrawPath($pen,$p); $pen.Dispose(); $p.Dispose()
}
function GradRound($g,$x,$y,$w,$h,$r,$c1,$c2){
  $p = RoundPath $x $y $w $h $r
  $rect = New-Object System.Drawing.RectangleF($x,$y,$w,$h)
  $br = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,$c1,$c2,30.0)
  $g.FillPath($br,$p); $br.Dispose(); $p.Dispose()
}
function Font([single]$size,[string]$style='Regular',[string]$name='Segoe UI'){
  New-Object System.Drawing.Font($name,$size,[System.Drawing.FontStyle]::$style)
}
function Text($g,[string]$s,$font,$col,[single]$x,[single]$y){
  $b = New-Object System.Drawing.SolidBrush $col
  $g.DrawString($s,$font,$b,$x,$y); $b.Dispose()
}
function TextC($g,[string]$s,$font,$col,[single]$cx,[single]$y){
  $b = New-Object System.Drawing.SolidBrush $col
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'
  $g.DrawString($s,$font,$b,$cx,$y,$sf); $b.Dispose()
}
function PlayTri($g,$col,[single]$cx,[single]$cy,[single]$size){
  $b = New-Object System.Drawing.SolidBrush $col
  $h = $size; $w = $size*0.92
  $p1 = New-Object System.Drawing.PointF(($cx-$w/3),($cy-$h/2))
  $p2 = New-Object System.Drawing.PointF(($cx-$w/3),($cy+$h/2))
  $p3 = New-Object System.Drawing.PointF(($cx+$w*0.6),$cy)
  $pts = [System.Drawing.PointF[]]@($p1,$p2,$p3)
  $g.FillPolygon($b,$pts); $b.Dispose()
}
function BG($g,$w,$h){
  $rect = New-Object System.Drawing.RectangleF(0,0,$w,$h)
  $br = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,$BG1,$BG0,60.0)
  $g.FillRectangle($br,0,0,$w,$h); $br.Dispose()
  # subtle red glow blob top-right
  $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $gp.AddEllipse(($w-420),-160,640,520)
  $pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush($gp)
  $pgb.CenterColor = (C 255 0 51 60)
  $pgb.SurroundColors = @((C 255 0 51 0))
  $g.FillPath($pgb,$gp); $pgb.Dispose(); $gp.Dispose()
}
function Caption($g,$w,[string]$title){
  TextC $g $title (Font 30 'Bold') $TXT ($w/2) 34
}
function Save($bmp,[string]$name){
  $path = Join-Path $out $name
  $bmp.Save($path,[System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "  $name" -ForegroundColor Green
}

# ---- draw the FloatTube panel shell, returns content top Y ----
function PanelShell($g,[single]$x,[single]$y,[single]$w,[single]$h){
  FillRound $g (C 18 18 20 245) $x $y $w $h 18
  StrokeRound $g $CARDB $x $y $w $h 18 1.5
  # header
  $hh = 44
  $hp = RoundPath $x $y $w $hh 18
  $hrect = New-Object System.Drawing.RectangleF($x,$y,$w,$hh)
  $hbr = New-Object System.Drawing.Drawing2D.LinearGradientBrush($hrect,(C 255 0 51 90),(C 120 0 255 70),20.0)
  $g.FillPath($hbr,$hp); $hbr.Dispose()
  # clip bottom of header round so it blends
  $g.FillRectangle((New-Object System.Drawing.SolidBrush (C 18 18 20 245)),$x,($y+$hh),$w,6)
  # dot + brand
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $RED2),($x+14),($y+17),10,10)
  Text $g "FloatTube" (Font 13 'Bold') $TXT ($x+32) ($y+12)
  Text $g "X" (Font 11 'Bold') $MUT ($x+$w-26) ($y+13)
  return ($y+$hh)
}
function Tabs($g,[single]$x,[single]$y,[single]$w,[int]$active){
  $labels = @("Stats","SEO","Tools")
  $tw = $w/3
  for($i=0;$i -lt 3;$i++){
    $tx = $x + $i*$tw
    if($i -eq $active){
      FillRound $g (C 255 255 255 16) ($tx+6) ($y+6) ($tw-12) 30 8
      Text $g $labels[$i] (Font 11 'Bold') $TXT ($tx+$tw/2-22) ($y+12)
      $g.FillRectangle((New-Object System.Drawing.SolidBrush $RED2),($tx+10),($y+38),($tw-20),2)
    } else {
      Text $g $labels[$i] (Font 11 'Bold') $MUT ($tx+$tw/2-22) ($y+12)
    }
  }
  return ($y+46)
}

Write-Host "Generating FloatTube store assets..." -ForegroundColor Cyan

# =====================================================================
# PROMO TILE 440x280
# =====================================================================
$r = NewBmp 440 280; $bmp=$r[0]; $g=$r[1]
BG $g 440 280
# icon rounded square
FillRound $g $RED 150 70 70 70 16
PlayTri $g ([System.Drawing.Color]::White) 178 105 34
# wordmark
TextC $g "FloatTube" (Font 34 'Bold') $TXT 220 150
TextC $g "Pop-Out Player & SEO" (Font 14 'Regular') $MUT 220 200
$g.Dispose(); Save $bmp "promo-440x280.png"; $bmp.Dispose()

# =====================================================================
# SCREENSHOT 1 — POP-OUT HERO
# =====================================================================
$r = NewBmp 1280 800; $bmp=$r[0]; $g=$r[1]
BG $g 1280 800
Caption $g 1280 "Watch on top of everything"
# faux desktop "other app" panel behind
FillRound $g (C 255 255 255 8) 80 150 720 560 16
StrokeRound $g $CARDB 80 150 720 560 16 1
Text $g "your work / another app..." (Font 16 'Regular') $MUT 110 180
for($i=0;$i -lt 6;$i++){ FillRound $g (C 255 255 255 8) 110 (230+$i*60) (640-($i*40)) 22 8 }
# floating pop-out player (always on top)
$px=700; $py=360; $pw=480; $ph=300
$g.FillRectangle((New-Object System.Drawing.SolidBrush (C 0 0 0 120)),($px+14),($py+18),$pw,$ph)
FillRound $g (C 10 10 12 255) $px $py $pw $ph 14
StrokeRound $g $RED2 $px $py $pw $ph 14 2
PlayTri $g (C 255 255 255 235) ($px+$pw/2) ($py+$ph/2-10) 56
# control bar with red pop-out button
FillRound $g (C 20 20 22 230) ($px+12) ($py+$ph-46) ($pw-24) 34 8
FillRound $g $RED ($px+22) ($py+$ph-40) 30 22 5
StrokeRound $g (C 255 255 255 120) ($px+27) ($py+$ph-35) 18 12 3 1.5
Text $g "Always on top" (Font 12 'Bold') $RED2 ($px+62) ($py+$ph-39)
# arrow tag
TextC $g "One click in the player bar -> floating window" (Font 15 'Regular') $MUT 640 740
$g.Dispose(); Save $bmp "screenshot-1-popout.png"; $bmp.Dispose()

# =====================================================================
# SCREENSHOT 2 — SEO PANEL
# =====================================================================
$r = NewBmp 1280 800; $bmp=$r[0]; $g=$r[1]
BG $g 1280 800
Caption $g 1280 "Instant SEO score, tags & hints"
$px=440; $pw=400; $py=150; $ph=440
$cy = PanelShell $g $px $py $pw $ph
$cy = Tabs $g $px $cy $pw 1
$cx = $px+20
# score ring
$ringX=$cx; $ringY=$cy+16; $ringR=44
$pen = New-Object System.Drawing.Pen((C 42 42 42 255),9); $g.DrawEllipse($pen,$ringX,$ringY,$ringR*2,$ringR*2); $pen.Dispose()
$pen2 = New-Object System.Drawing.Pen($GREEN,9); $pen2.StartCap='Round'; $pen2.EndCap='Round'
$g.DrawArc($pen2,$ringX,$ringY,$ringR*2,$ringR*2,-90,295); $pen2.Dispose()
TextC $g "82" (Font 26 'Bold') $TXT ($ringX+$ringR) ($ringY+24)
TextC $g "SEO" (Font 9 'Regular') $MUT ($ringX+$ringR) ($ringY+58)
# hints
$hints = @(@("Title is ideal (58 chars)",$GREEN),@("12 tags",$GREEN),@("Rich description",$GREEN),@("Add hashtags",$YELLOW))
$hy=$cy+12
foreach($h in $hints){
  FillRound $g (C 255 255 255 12) ($cx+115) $hy 230 30 7
  $dotc = $h[1]
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $dotc),($cx+125),($hy+11),8,8)
  Text $g $h[0] (Font 11 'Regular') $TXT ($cx+142) ($hy+7)
  $hy += 38
}
# tags subhead + chips
Text $g "Tags - 12" (Font 12 'Bold') $TXT $cx ($cy+170)
Text $g "copy   #hashtags" (Font 11 'Regular') (C 74 168 255) ($px+$pw-150) ($cy+170)
$chips = @("tutorial","seo","youtube","growth","editing","2026","howto","ranking","views","tags")
$chx=$cx; $chy=$cy+200
foreach($t in $chips){
  $tw = [single]($t.Length*7.5 + 22)
  if(($chx+$tw) -gt ($px+$pw-20)){ $chx=$cx; $chy+=34 }
  FillRound $g (C 255 255 255 16) $chx $chy $tw 26 13
  Text $g $t (Font 10 'Regular') $TXT ($chx+11) ($chy+5)
  $chx += $tw+8
}
$g.Dispose(); Save $bmp "screenshot-2-seo.png"; $bmp.Dispose()

# =====================================================================
# SCREENSHOT 3 — STATS PANEL
# =====================================================================
$r = NewBmp 1280 800; $bmp=$r[0]; $g=$r[1]
BG $g 1280 800
Caption $g 1280 "All the numbers that matter"
$px=440; $pw=400; $py=150; $ph=470
$cy = PanelShell $g $px $py $pw $ph
$cy = Tabs $g $px $cy $pw 0
$cx=$px+20
$stats = @(
  @("26.9K","Views"),@("1.4K","Likes"),@("6.1%","Engagement"),
  @("807","views/day"),@("12:04","Duration"),@("3","days")
)
$gw=($pw-40-16)/3
for($i=0;$i -lt 6;$i++){
  $col=$i%3; $row=[math]::Floor($i/3)
  $sx=$cx+$col*($gw+8); $sy=$cy+12+$row*86
  FillRound $g $CARD $sx $sy $gw 78 11
  StrokeRound $g $CARDB $sx $sy $gw 78 11 1
  TextC $g $stats[$i][0] (Font 17 'Bold') $TXT ($sx+$gw/2) ($sy+14)
  TextC $g $stats[$i][1] (Font 9 'Regular') $MUT ($sx+$gw/2) ($sy+46)
}
$ly=$cy+200
$lines=@(@("Category","Education"),@("Channel","Your Channel"),@("Video ID","dQw4w9WgXcQ"))
foreach($l in $lines){
  Text $g $l[0] (Font 11 'Regular') $MUT $cx $ly
  Text $g $l[1] (Font 11 'Bold') $TXT ($px+$pw-($l[1].Length*8)-24) $ly
  $g.DrawLine((New-Object System.Drawing.Pen (C 255 255 255 16)),$cx,($ly+26),($px+$pw-20),($ly+26))
  $ly+=40
}
$g.Dispose(); Save $bmp "screenshot-3-stats.png"; $bmp.Dispose()

# =====================================================================
# SCREENSHOT 4 — TOOLS PANEL
# =====================================================================
$r = NewBmp 1280 800; $bmp=$r[0]; $g=$r[1]
BG $g 1280 800
Caption $g 1280 "Speed, A-B loop, screenshots & more"
$px=440; $pw=400; $py=150; $ph=500
$cy = PanelShell $g $px $py $pw $ph
$cy = Tabs $g $px $cy $pw 2
$cx=$px+20; $iw=$pw-40
# primary pop out
GradRound $g $cx ($cy+12) $iw 40 10 $RED2 $RED
TextC $g "Pop Out (Picture-in-Picture)" (Font 12 'Bold') $TXT ($px+$pw/2) ($cy+23)
# two tools
FillRound $g $CARD $cx ($cy+62) (($iw-8)/2) 38 9
FillRound $g $CARD ($cx+($iw+8)/2) ($cy+62) (($iw-8)/2) 38 9
TextC $g "Save frame" (Font 11 'Bold') $TXT ($cx+($iw-8)/4) ($cy+72)
TextC $g "Link at time" (Font 11 'Bold') $TXT ($cx+($iw+8)/2+($iw-8)/4) ($cy+72)
# speed pills
Text $g "Playback speed" (Font 12 'Bold') $TXT $cx ($cy+114)
$speeds=@("1x","1.5x","2x","2.5x","3x"); $sw=($iw-32)/5
for($i=0;$i -lt 5;$i++){
  $sx=$cx+$i*($sw+8)
  FillRound $g $CARD $sx ($cy+138) $sw 32 8
  TextC $g $speeds[$i] (Font 10 'Bold') $TXT ($sx+$sw/2) ($cy+145)
}
# A-B
Text $g "A-B Repeat" (Font 12 'Bold') $TXT $cx ($cy+186)
FillRound $g $CARD $cx ($cy+210) (($iw-8)/2) 38 9
StrokeRound $g $RED2 $cx ($cy+210) (($iw-8)/2) 38 9 1.5
FillRound $g $CARD ($cx+($iw+8)/2) ($cy+210) (($iw-8)/2) 38 9
TextC $g "A  0:42" (Font 11 'Bold') $RED2 ($cx+($iw-8)/4) ($cy+220)
TextC $g "B" (Font 11 'Bold') $TXT ($cx+($iw+8)/2+($iw-8)/4) ($cy+220)
# thumbnail row
Text $g "Download thumbnail" (Font 12 'Bold') $TXT $cx ($cy+262)
$th=@("Max","HQ","MQ"); $thw=($iw-16)/3
for($i=0;$i -lt 3;$i++){
  $sx=$cx+$i*($thw+8)
  FillRound $g $CARD $sx ($cy+286) $thw 36 9
  TextC $g $th[$i] (Font 11 'Bold') $TXT ($sx+$thw/2) ($cy+295)
}
# export
StrokeRound $g $CARDB $cx ($cy+336) $iw 38 9 1
TextC $g "Export stats as JSON" (Font 11 'Bold') $MUT ($px+$pw/2) ($cy+346)
$g.Dispose(); Save $bmp "screenshot-4-tools.png"; $bmp.Dispose()

# =====================================================================
# SCREENSHOT 5 — LAUNCHER (out of your way)
# =====================================================================
$r = NewBmp 1280 800; $bmp=$r[0]; $g=$r[1]
BG $g 1280 800
Caption $g 1280 "Stays out of your way until you need it"
# faux video page
FillRound $g (C 0 0 0 200) 90 150 980 560 14
StrokeRound $g $CARDB 90 150 980 560 14 1
PlayTri $g (C 255 255 255 60) 580 430 70
Text $g "youtube.com / watch" (Font 14 'Regular') $MUT 120 175
# launcher tab on right edge
$lx=1070; $ly=300
FillRound $g (C 18 18 20 245) $lx $ly 120 46 14
StrokeRound $g $CARDB $lx $ly 120 46 14 1
$g.FillEllipse((New-Object System.Drawing.SolidBrush $RED2),($lx+18),($ly+18),10,10)
Text $g "Stats" (Font 13 'Bold') $TXT ($lx+38) ($ly+13)
# pointer
TextC $g "A tiny tab -> click to open the full panel" (Font 15 'Regular') $MUT 640 740
$g.Dispose(); Save $bmp "screenshot-5-launcher.png"; $bmp.Dispose()

# =====================================================================
# MARQUEE PROMO 1400x560
# =====================================================================
$r = NewBmp 1400 560; $bmp=$r[0]; $g=$r[1]
BG $g 1400 560
# left branding
FillRound $g $RED 90 150 92 92 18
PlayTri $g ([System.Drawing.Color]::White) 126 196 44
Text $g "FloatTube" (Font 54 'Bold') $TXT 205 150
Text $g "Pop-Out Player & SEO" (Font 23 'Regular') $RED2 208 230
Text $g "Always-on-top player  -  SEO score  -  tags  -  stats  -  tools" (Font 16 'Regular') $MUT 208 285
Text $g "Watch anywhere while you work. No account. No tracking." (Font 15 'Regular') $MUT 208 330
# right: floating player mock
$px=770; $py=130; $pw=540; $ph=300
$g.FillRectangle((New-Object System.Drawing.SolidBrush (C 0 0 0 120)),($px+14),($py+18),$pw,$ph)
FillRound $g (C 10 10 12 255) $px $py $pw $ph 14
StrokeRound $g $RED2 $px $py $pw $ph 14 2
PlayTri $g (C 255 255 255 235) ($px+$pw/2) ($py+$ph/2-12) 54
FillRound $g (C 20 20 22 235) ($px+12) ($py+$ph-46) ($pw-24) 34 8
FillRound $g $RED ($px+22) ($py+$ph-40) 30 22 5
StrokeRound $g (C 255 255 255 120) ($px+27) ($py+$ph-35) 18 12 3 1.5
Text $g "Always on top" (Font 12 'Bold') $RED2 ($px+62) ($py+$ph-39)
# small SEO score badge in the lower-left gap (clear of the player)
$bx=600; $by=405; $bw=150; $bh=120
FillRound $g (C 18 18 20 255) $bx $by $bw $bh 14
StrokeRound $g $CARDB $bx $by $bw $bh 14 1
$rr=38
$ccx=$bx+$bw/2            # ring centered horizontally in the badge
$rx=$ccx-$rr; $ry=$by+14  # ring top-left
$ringCy=$ry+$rr           # ring center Y
$pen = New-Object System.Drawing.Pen((C 42 42 42 255),8); $g.DrawEllipse($pen,$rx,$ry,$rr*2,$rr*2); $pen.Dispose()
$pen2 = New-Object System.Drawing.Pen($GREEN,8); $pen2.StartCap='Round'; $pen2.EndCap='Round'
$g.DrawArc($pen2,$rx,$ry,$rr*2,$rr*2,-90,295); $pen2.Dispose()
TextC $g "82" (Font 22 'Bold') $TXT $ccx ($ringCy-16)
TextC $g "SEO score" (Font 10 'Regular') $MUT $ccx ($by+$bh-20)
$g.Dispose(); Save $bmp "marquee-1400x560.png"; $bmp.Dispose()

Write-Host "Done. Assets in: $out" -ForegroundColor Cyan
