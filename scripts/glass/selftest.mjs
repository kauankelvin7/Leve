import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { checkCss, blurVariables, lockRequired } from './check.mjs';
import { measureColor } from './color.mjs';
assert.equal(lockRequired(false,true),true);
assert.equal(lockRequired(false,false),false);
assert.equal(lockRequired(true,true),false);
assert.equal(checkCss('.a{backdrop-filter:blur(32px)}','fixture').length,1);
assert.equal(checkCss('.a{backdrop-filter:blur(34px)}','fixture').length,1);
assert.equal(checkCss('.a{backdrop-filter:blur(var(--blur))}','fixture').length,1);
assert.equal(checkCss('.a{backdrop-filter:blur(var(--blur))}','fixture',{variables:blurVariables(':root{--blur:18px}')} ).length,0);
assert.match(checkCss('.a{backdrop-filter:blur(var(--blur))}','fixture',{variables:blurVariables(':root{--blur:29px}')} )[0],/MAX_BLUR_24/);
assert.match(checkCss('.a{backdrop-filter:blur(var(--unknown))}','fixture')[0],/UNMEASURED_BLUR/);
assert.match(checkCss('.a{backdrop-filter:blur(calc(12px + 1px))}','fixture')[0],/UNMEASURED_BLUR/);
assert.equal(checkCss('.a{backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}','fixture',{primitive:true}).length,0);
assert.equal(checkCss('.a{backdrop-filter:blur(24px)}','fixture',{primitive:true}).length,1);
assert.equal(checkCss('.a{backdrop-filter:blur(18px)}','fixture',{complete:true}).length,1);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for(const [value, expected] of [['#ff000080',[255,0,0,128]],['rgb(255 0 0 / 50%)',[255,0,0,128]],['rgba(0, 255, 0, 0.25)',[0,255,0,64]],['color(srgb 0 0 1 / 0.5)',[0,0,255,128]],['oklch(0.5 0 0)',[99,99,99,255]]]) {
    const measured = await page.evaluate(measureColor,value);
    measured.rgba.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<=1,`${value}: ${measured.rgba}`));
  }
  for(const value of ['UNKNOWN','rgb(broken)','var(--unknown)','currentColor','inherit']) {
    await assert.rejects(page.evaluate(measureColor,value),/UNMEASURED_COLOR/);
  }
  console.log('PASS static blur/pair/centralization and native CSS color/alpha selftests');
} finally { await browser.close(); }
