// Codespaces forwards localhost using its signed-in, private port access.
// Never create a public tunnel or change port visibility here.
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000}).trim();
function sync(){
  try{
    // Preserve local edits, alternate branches and local-only commits.
    if(git(['status','--porcelain'])||git(['branch','--show-current'])!=='master')return;
    git(['fetch','origin','master']);
    git(['merge','--ff-only','--no-edit','origin/master']);
  }catch(error){console.error('Automatic update skipped; local work was preserved. Check Git access or update manually.');}
}
sync();
const server=spawn(process.execPath,['tools/dev-server.mjs',process.env.BURNICE_PREVIEW_PORT??'4173'],{cwd:root,stdio:'inherit'});
const updates=setInterval(sync,20000);
let stopping=false;
function stop(){if(stopping)return;stopping=true;clearInterval(updates);server.kill('SIGTERM');}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
server.on('error',error=>{console.error(error.message);clearInterval(updates);process.exitCode=1;});
server.on('exit',code=>{clearInterval(updates);if(!stopping)process.exitCode=code??1;});
