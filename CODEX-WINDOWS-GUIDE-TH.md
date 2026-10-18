# วิธีติดตั้ง Codex และสานต่อเกม Burnice Pixel Walk บน Windows

คู่มือนี้ตรวจเอกสารทางการของ OpenAI วันที่ 18 ตุลาคม 2026
ชื่อเมนูอาจต่างเล็กน้อยตามรุ่นแอปและบัญชี ใช้ Windows เป็นตัวอย่างหลัก
ไม่ต้องติดตั้งทุกทางเลือก: เลือก Desktop, VS Code หรือ CLI อย่างใดอย่างหนึ่งก็ทำงานได้

## 1. เตรียมไฟล์เกม

1. ดาวน์โหลด Burnice-Pixel-Walk-Codex-Source-v8.zip แล้วคลิกขวา > Extract All
2. ย้ายโฟลเดอร์ Burnice-Pixel-Walk ไปไว้ เช่น `C:\Games\Burnice-Pixel-Walk`
3. เปิดโฟลเดอร์นั้น ต้องเห็น README.md, AGENTS.md, package.json, start-game.cmd, dist, tests และ tools อยู่ด้วยกัน
4. เลือกโฟลเดอร์รากนี้เป็นโปรเจกต์ใน Codex อย่าเลือกเพียง dist หรือ assets เพราะจะขาดคำแนะนำและ tests

เกมเป็น HTML/CSS/JavaScript Canvas ใช้ ES modules ไม่ใช่ Unity/Godot และไม่มีขั้นตอน build
ZIP รวมไฟล์ต้นฉบับที่ Git ติดตามทั้ง 485 ไฟล์ พร้อมภาพที่ใช้จริงและภาพต้นฉบับจาก Image Generation
ไฟล์เปิดเกมกับเอกสารส่งต่องานถูกเพิ่มให้สำหรับใช้งานในเครื่อง

## 2. ติดตั้งเครื่องมือสำหรับเกม

เปิด Start > พิมพ์ PowerShell > เปิด Windows PowerShell หรือ Terminal แล้วรันทีละบรรทัด:

~~~powershell
winget install --id OpenJS.NodeJS.LTS
winget install --id Git.Git
~~~

Node.js ใช้เปิด local server และรัน tests ส่วน Git ใช้เก็บจุดย้อนกลับของโค้ด
ถ้ามีติดตั้งอยู่แล้วไม่ต้องลงซ้ำ ปิดแล้วเปิด Terminal และแอป Codex ใหม่หลังติดตั้งเพื่อให้เห็น PATH ใหม่
ตรวจด้วย:

~~~powershell
node --version
npm.cmd --version
git --version
~~~

เกมนี้กำหนด Node.js 20 ขึ้นไป ใช้ Node.js รุ่น LTS จากตัวติดตั้งด้านบนได้
หากเครื่องไม่มี winget ให้ติดตั้งผ่านหน้าเว็บทางการของ [Node.js](https://nodejs.org/) และ [Git](https://git-scm.com/)
คำสั่งติดตั้ง Node.js/Git อ้างอิง [คู่มือ Windows ของ OpenAI](https://learn.chatgpt.com/docs/windows/windows-app)

## 3. วิธีใช้ Codex ผ่าน Desktop

ตามเอกสารปัจจุบัน งาน Codex อยู่ในแอป ChatGPT Desktop โดยเลือก Codex จากตัวเลือก ChatGPT ด้านบน
หากมีแอปอยู่แล้วให้อัปเดตและตรวจตัวเลือกนี้ก่อน ไม่จำเป็นต้องติดตั้ง CLI เพิ่มเพื่อใช้ Desktop

1. เปิด [หน้าติดตั้ง Windows ทางการ](https://learn.chatgpt.com/docs/windows/windows-app) แล้วกดลิงก์ดาวน์โหลด หรือใช้คำสั่ง:

~~~powershell
winget install --id 9PLM9XGG6VKS -s msstore
~~~

2. เปิดแอป แล้ว Sign in ด้วยบัญชี ChatGPT ของคุณ
3. เลือก Codex จากเมนูเลือกผลิตภัณฑ์ ChatGPT
4. ใช้ Add new project / Open folder หรือ Ctrl+O แล้วเลือก `C:\Games\Burnice-Pixel-Walk`
5. ให้โฟลเดอร์นี้เป็นโฟลเดอร์หลักของโปรเจกต์ แล้วเริ่มแชต Codex ในโปรเจกต์นั้น
6. ใช้สภาพแวดล้อม Windows native ได้สำหรับเกมนี้ ไม่ต้องตั้ง WSL เพื่อเริ่มเล่นหรือแก้ JavaScript
7. เปิด FIRST-CODEX-PROMPT.txt คัดลอกทั้งหมดไปส่งในแชตแรก

อ้างอิง: [OpenAI Quickstart](https://learn.chatgpt.com/docs/quickstart?setup=app), [Windows](https://learn.chatgpt.com/docs/windows/windows-app), [Projects](https://learn.chatgpt.com/docs/projects?surface=app)

## 4. ทางเลือก: ใช้ Codex ใน VS Code

เหมาะหากอยากเห็นโครงสร้างไฟล์ โค้ด และข้อความคุยอยู่ข้างกัน

1. ติดตั้ง VS Code หากยังไม่มี จาก [code.visualstudio.com](https://code.visualstudio.com/)
2. เปิด [หน้าส่วนขยาย Codex ทางการของ OpenAI](https://learn.chatgpt.com/docs/codex/ide) และกด Install the extension
3. เปิด VS Code > File > Open Folder > เลือกโฟลเดอร์ Burnice-Pixel-Walk
4. เปิดไอคอน Codex แล้วลงชื่อเข้าใช้ตามหน้าจอ หากไม่เห็น ใช้ Ctrl+Shift+P > Codex: Open Codex Sidebar
5. ส่งข้อความจาก FIRST-CODEX-PROMPT.txt แล้วทำงานต่อในโฟลเดอร์นี้
6. เปิด Terminal > New Terminal เพื่อใช้คำสั่งเปิดเกมและทดสอบด้านล่าง

อ้างอิง: [Codex IDE extension](https://learn.chatgpt.com/docs/codex/ide)

## 5. ทางเลือก: ติดตั้ง Codex CLI

ถ้าต้องการสั่งงานใน Terminal หลังติดตั้ง Node.js แล้ว ให้รัน:

~~~powershell
npm.cmd install -g @openai/codex@latest
codex.cmd --version
cd C:\Games\Burnice-Pixel-Walk
codex.cmd
~~~

ครั้งแรกเลือก Sign in with ChatGPT แล้วทำตามหน้าต่างเบราว์เซอร์ที่เปิดขึ้น
จากนั้นวางข้อความจาก FIRST-CODEX-PROMPT.txt เพื่อให้ Codex รับช่วงงาน
ใช้บัญชี ChatGPT ได้ตามสิทธิ์ที่บัญชี/เวิร์กสเปซเปิดให้ ไม่ต้องสร้าง API key สำหรับตัวเกม
การลงชื่อเข้าใช้ด้วย API key เป็นอีกทางเลือกหนึ่ง ไม่จำเป็นสำหรับวิธีเริ่มต้นนี้

ใน Command Prompt หรือเมื่อไม่มีปัญหา PowerShell policy สามารถใช้ `npm` และ `codex` โดยไม่เติม .cmd ได้
อัปเดต CLI ภายหลังด้วยคำสั่งติดตั้งเดิม

ออกแล้วกลับมาคุยงานเดิมด้วย:

~~~powershell
cd C:\Games\Burnice-Pixel-Walk
codex.cmd resume
~~~

อ้างอิง: [CLI](https://learn.chatgpt.com/docs/codex/cli), [คำสั่งติดตั้ง npm](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex), [Authentication](https://learn.chatgpt.com/docs/auth), [การกลับมาทำงานต่อ](https://learn.chatgpt.com/docs/projects?surface=app)

## 6. เปิดเกมในเครื่อง

วิธีง่าย: ดับเบิลคลิก start-game.cmd แล้วเปิด http://127.0.0.1:4173
ต้องเปิดหน้าต่างตัวรันค้างไว้ ปิดเกมเซิร์ฟเวอร์ด้วย Ctrl+C

หรือรันใน Terminal:

~~~powershell
cd C:\Games\Burnice-Pixel-Walk
npm.cmd start
~~~

นำ URL ที่แสดงไปเปิดในเบราว์เซอร์ เวลาปรับโค้ดให้บันทึกไฟล์แล้วรีเฟรชหน้าเกม
ไม่ต้อง npm install เพราะไม่มี package dependencies และไม่ต้อง npm run build
อย่าดับเบิลคลิก dist/index.html เพราะการโหลด JavaScript modules ผ่าน file:// อาจไม่ทำงาน

เปิด Terminal อีกหน้าต่างเพื่อรัน tests ขณะ server ยังทำงาน:

~~~powershell
cd C:\Games\Burnice-Pixel-Walk
npm.cmd test
~~~

Baseline ตอนส่งต่อคือ 45 tests ผ่าน หากจำนวนเปลี่ยนหลังพัฒนา ให้ดูว่ามีการเพิ่ม/ลบ tests จริงหรือไม่
หากพอร์ต 4173 ถูกใช้ ให้หยุดตัวรันเดิมด้วย Ctrl+C แล้วใช้:

~~~powershell
npm.cmd start -- 4174
~~~

เปิด http://127.0.0.1:4174 แทน
ตัวรันนี้เปิดให้เฉพาะเครื่องตัวเอง ไม่ใช่ระบบเผยแพร่เกมออนไลน์

## 7. ให้ Codex รับช่วงงานได้ครบ

ให้ Codex อ่าน AGENTS.md และ CODEX_HANDOFF.md ก่อน โดย FIRST-CODEX-PROMPT.txt เตรียมคำสั่งนี้ไว้แล้ว
AGENTS.md เป็นคำแนะนำระดับโปรเจกต์ที่ Codex อ่านก่อนทำงาน ส่วน handoff อธิบายระบบและรายละเอียดเฉพาะเกม
อย่าคาดว่าประวัติ Work/ไฟล์แนบ/การตั้งค่าเครื่องมือเดิมจะย้ายเข้าแชต Codex ใหม่อัตโนมัติ

สิ่งที่เก็บบริบทไว้แล้ว:

| ไฟล์ | ใช้ทำอะไร |
| --- | --- |
| AGENTS.md | ข้อตกลงในการทำงานและสิ่งที่ต้องรักษา |
| CODEX_HANDOFF.md | สถาปัตยกรรม ปุ่มเล่น ค่าระบบ ชุด Sprite และสถานะล่าสุด |
| docs/DEVELOPMENT-HISTORY.md | บันทึก v1–v8 และ prompt สร้างภาพเดิม |
| dist/assets/corrected-v8-atlas.json | metadata ปัจจุบันของ combat/item/effects 200 เฟรม |
| dist/assets/burnice-atlas.json | metadata เดิน/idle อีก 24 เฟรม |

อ้างอิง: [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [Projects and chats](https://learn.chatgpt.com/docs/projects?surface=app)

หลัง Codex ตรวจโปรเจกต์และเปิดเกมได้แล้ว ให้ส่งงานถัดไปเป็นชิ้น ๆ โดยระบุพฤติกรรมและวิธีดูผล เช่น:

> เพิ่มมอนสเตอร์เดินลาดตระเวน 1 ชนิดในลาน ใช้ระบบดาเมจและ HP เดิม ให้โดนฟันและดรอป Nitro-Fuel ผ่านระบบ rare drop เดิม สร้างภาพด้วย Image Generation แล้วหั่นเฟรมให้ขนาดเข้ากับ Burnice อัปเดต sprite inspector และตรวจการตาย/ดรอป/การชนก่อนส่งงาน

นี่เป็นเพียงตัวอย่างคำสั่ง ไม่ได้เริ่มทำฟีเจอร์นี้ในแพ็กส่งต่อ
หากพบภาพกระตุกหรือเฟรมผิด ให้แนบ screenshot พร้อมทิศ/ปุ่ม/ชื่ออนิเมชั่น และให้ Codex ตรวจ sprite inspector ก่อนสร้างภาพใหม่

## 8. สร้างภาพ Sprite ต่อด้วยวิธีเดิม

ภาพเดิมอยู่ครบ ใช้ไฟล์ *-generated.png เป็น reference และให้ Codex ตรวจเครื่องมือสร้างภาพที่มีในไคลเอนต์นั้น
เอกสาร OpenAI ระบุการเรียก image generation ด้วยคำสั่งธรรมชาติหรือ $imagegen และการแนบภาพอ้างอิง
ความพร้อมใช้งานขึ้นกับบัญชี/เวิร์กสเปซ/ไคลเอนต์ หากไม่มีเครื่องมือนี้ ให้สร้างภาพใน ChatGPT แล้วนำ PNG กลับมาให้ Codex หั่นและใส่ในเกม

ตัวอย่างคำสั่ง:

> ใช้ $imagegen สร้าง sprite sheet โดยอ้างอิง dist/assets/burnice-generated.png รักษาหน้าตา ชุด สัดส่วน มุมกล้อง และขนาดเดิม พื้นหลังโปร่งใส เฟรมไม่ทับกัน มีพื้นที่ขอบเผื่ออาวุธ จากนั้นหั่นเป็น PNG และ atlas ด้วย nearest-neighbor พร้อมจัด foot anchor ให้ตรงกับเกม

อ้างอิง: [Image generation](https://learn.chatgpt.com/docs/image-generation)

ถ้าจะใช้ Python tools สำหรับหั่นภาพ ให้ติดตั้ง Python 3 และสร้าง environment:

~~~powershell
cd C:\Games\Burnice-Pixel-Walk
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-art.txt
~~~

ไม่ต้อง activate environment ก็เรียก Python ใน .venv ตามตัวอย่างได้
เครื่องมือหั่นภาพแต่ละตัวจะเขียน atlas/metadata/ZIP ทับ ให้เลือกสคริปต์ตามงาน ไม่ต้องรันทุกตัวเพื่อเริ่มเกม
Nitro-Fuel ต้องใช้กระป๋องโลหะสีทอง v8; คงการเลือก connected subject ทั้งชิ้นของ shooter/projectile เพื่อไม่ให้ฐานหุ่นเฟรมก่อนหน้าติดมาอีก

## 9. เก็บจุดย้อนกลับด้วย Git

ZIP นี้เป็นไฟล์ซอร์สปัจจุบัน ไม่รวมประวัติ Git เก่า เริ่ม repo ในเครื่องใหม่ได้:

~~~powershell
cd C:\Games\Burnice-Pixel-Walk
git init
git add .
git commit -m "Import Burnice Pixel Walk v8 source"
~~~

หาก Git ถามชื่อและอีเมล ให้ตั้งข้อมูลของคุณสำหรับ repo นี้ก่อน commit เช่น:

~~~powershell
git config user.name "Your Name"
git config user.email "you@example.com"
~~~

แล้วรัน commit อีกครั้ง หลังตรวจการแก้แต่ละงานด้วย `git diff` และ tests ผ่าน ค่อยสร้าง commit ถัดไป
ไม่ต้องมี GitHub เพื่อเล่นหรือพัฒนาบนเครื่อง หากจะสำรองขึ้น remote ให้เลือกปลายทางและสิทธิ์เข้าถึงด้วยตัวเอง

## 10. ปัญหาที่เจอบ่อย

| อาการ | วิธีแก้ |
| --- | --- |
| node / npm / codex ไม่พบคำสั่ง | ปิดเปิด Terminal และแอปใหม่ ตรวจการติดตั้งและ PATH |
| npm.ps1 หรือ codex.ps1 ถูก policy บล็อก | ใช้ npm.cmd / codex.cmd หรือ Command Prompt ตามตัวอย่าง |
| เปิดเกมจาก ZIP แล้วไฟล์หาย | Extract All ให้ครบ แล้วเปิดโฟลเดอร์ที่มี package.json |
| Failed to fetch / โหลด modules ไม่ได้ | ใช้ npm.cmd start แล้วเปิด URL http://127.0.0.1 แทน file:// |
| พอร์ตถูกใช้อยู่ | ใช้ npm.cmd start -- 4174 แล้วเปิดพอร์ตเดียวกัน |
| แก้แล้วภาพยังเก่า | บันทึกไฟล์และ Ctrl+F5; ตรวจว่าเปิดเกมจากโฟลเดอร์/พอร์ตที่กำลังแก้ |
| Codex บอกว่าไม่มีบริบทเดิม | ส่ง FIRST-CODEX-PROMPT.txt และให้ยืนยันว่าอ่าน CODEX_HANDOFF.md ในโฟลเดอร์นี้ |

การแก้ในเครื่องไม่อัปเดต Site เดิมอัตโนมัติ เมื่อพร้อมเผยแพร่ค่อยเลือกวิธี deploy แยกต่างหาก
เกมในชุดนี้ผ่านชุดทดสอบ Node และตรวจไฟล์/HTTP แต่ยังไม่ได้รัน GUI บน Windows จริงในขั้นตอนจัดส่ง
