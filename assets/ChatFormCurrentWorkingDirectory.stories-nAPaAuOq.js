import{p as $,f as W,n as O,g as r,s,a as w,d as F,e as S,b as x,a3 as R,x as t}from"./iframe-BxvSZK0j.js";import{c as M,i as T,d as q}from"./create-runtime-stories-DF7OwIoM.js";import{t as U,d as N,S as v,s as G,e as H,g as y,p as Y}from"./fixtures-B8POsIjj.js";import{C as D}from"./ChatFormCurrentWorkingDirectory-828uF3xY.js";import{F as B}from"./library.constants-v9JM2Zdd.js";import"./preload-helper-PPVm8Dsz.js";import"./index.svelte-B6jPthz0.js";import"./audio-format-YL0iSAfS.js";import"./pwa.constants-BmTqcZii.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./ui.enums-DjR_vYxk.js";import"./info-Cb5cGIZT.js";import"./Icon-CSRBsjq8.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";import"./clone-D1y8Q09X.js";import"./chat-tabs.constants-BXUE-QDX.js";import"./ActionIcon-CLpfwUjP.js";import"./button-xywSqPau.js";import"./this-PF-vsikk.js";import"./css-classes.constants-B-GZedvn.js";import"./check-DMUsyudZ.js";import"./copy-DUPeaLcG.js";import"./GlassKey-DQnWqGBZ.js";import"./x-DXCCWZ3I.js";import"./input-CLr4-AYd.js";import"./input-BVFa53i-.js";import"./drawer-trigger-DQGelv4k.js";import"./dialog-content-Bi_qY7pE.js";import"./dialog-description-D6Mb1Tvy.js";import"./popover-trigger-DEKMn7ku.js";import"./floating-layer-anchor-DpndBh7P.js";import"./settings-vDMD8fT9.js";import"./wrench-C98Yxdx8.js";const{fn:p}=__STORYBOOK_MODULE_TEST__,a=(c,h=O)=>{var l=L(),d=s(x(l),2);D(d,R(h)),w(c,l)},I={args:{directory:null,isOpen:!1,onChange:p(),onClose:p(),onOpen:p(),query:""},component:D,parameters:{layout:"centered"},title:"Chat/ChatScreen/ChatForm/ChatFormCurrentWorkingDirectory"},{Story:i}=q(),K=U(N.map(c=>({path:c,type:B.DIRECTORY})));function o(c={}){return()=>G({serverHome:v,serverTools:H,...c})}var L=S('<div class="relative mt-80 grid w-[32rem]"><div class="h-12 rounded-3xl border"></div> <!></div>'),V=S("<!> <!> <!> <!> <!> <!> <!> <!> <!>",1);function P(c,h){$(h,!1),T();var l=V(),d=W(l);{let e=t(o);i(d,{get beforeEach(){return r(e)},name:"Default",get template(){return a},parameters:{__svelteCsf:{rawCode:`<!-- the picker anchors to the form; the chip sits below it -->
<div class="relative mt-80 grid w-[32rem]">
	<div class="h-12 rounded-3xl border"></div>

	<ChatFormCurrentWorkingDirectory {...args} />
</div>`}}})}var g=s(d,2);{let e=t(()=>({directory:`${v}/llama.cpp/tools/ui`})),m=t(o);i(g,{get args(){return r(e)},get beforeEach(){return r(m)},name:"WithDirectory",get template(){return a},parameters:{__svelteCsf:{rawCode:`<!-- the picker anchors to the form; the chip sits below it -->
<div class="relative mt-80 grid w-[32rem]">
	<div class="h-12 rounded-3xl border"></div>

	<ChatFormCurrentWorkingDirectory {...args} />
</div>`}}})}var u=s(g,2);{let e=t(()=>({directory:`${v}/llama.cpp/tools/ui`,disabled:!0})),m=t(o);i(u,{get args(){return r(e)},get beforeEach(){return r(m)},name:"Disabled",get template(){return a},parameters:{__svelteCsf:{rawCode:`<!-- the picker anchors to the form; the chip sits below it -->
<div class="relative mt-80 grid w-[32rem]">
	<div class="h-12 rounded-3xl border"></div>

	<ChatFormCurrentWorkingDirectory {...args} />
</div>`}}})}var _=s(u,2);{let e=t(o);i(_,{args:{isOpen:!0},get beforeEach(){return r(e)},name:"PickerOpen",get template(){return a},parameters:{__svelteCsf:{rawCode:`<!-- the picker anchors to the form; the chip sits below it -->
<div class="relative mt-80 grid w-[32rem]">
	<div class="h-12 rounded-3xl border"></div>

	<ChatFormCurrentWorkingDirectory {...args} />
</div>`}}})}var f=s(_,2);{let e=t(()=>o({globSearch:y(K)}));i(f,{args:{isOpen:!0,query:"llama"},get beforeEach(){return r(e)},name:"PickerWithResults",get template(){return a},parameters:{__svelteCsf:{rawCode:`<!-- the picker anchors to the form; the chip sits below it -->
<div class="relative mt-80 grid w-[32rem]">
	<div class="h-12 rounded-3xl border"></div>

	<ChatFormCurrentWorkingDirectory {...args} />
</div>`}}})}var k=s(f,2);{let e=t(()=>o({globSearch:Y()}));i(k,{args:{isOpen:!0,query:"searching"},get beforeEach(){return r(e)},name:"PickerSearching",get template(){return a},parameters:{__svelteCsf:{rawCode:`<!-- the picker anchors to the form; the chip sits below it -->
<div class="relative mt-80 grid w-[32rem]">
	<div class="h-12 rounded-3xl border"></div>

	<ChatFormCurrentWorkingDirectory {...args} />
</div>`}}})}var C=s(k,2);{let e=t(()=>o({globSearch:y([])}));i(C,{args:{isOpen:!0,query:"nowhere"},get beforeEach(){return r(e)},name:"PickerNoMatch",get template(){return a},parameters:{__svelteCsf:{rawCode:`<!-- the picker anchors to the form; the chip sits below it -->
<div class="relative mt-80 grid w-[32rem]">
	<div class="h-12 rounded-3xl border"></div>

	<ChatFormCurrentWorkingDirectory {...args} />
</div>`}}})}var b=s(C,2);{let e=t(()=>o({globSearch:async()=>({error:"path is outside the allowed roots"})}));i(b,{args:{isOpen:!0,query:"root"},get beforeEach(){return r(e)},name:"PickerSearchError",get template(){return a},parameters:{__svelteCsf:{rawCode:`<!-- the picker anchors to the form; the chip sits below it -->
<div class="relative mt-80 grid w-[32rem]">
	<div class="h-12 rounded-3xl border"></div>

	<ChatFormCurrentWorkingDirectory {...args} />
</div>`}}})}var E=s(b,2);{let e=t(()=>o({serverTools:[]}));i(E,{args:{isOpen:!0},get beforeEach(){return r(e)},name:"PickerSearchUnavailable",get template(){return a},parameters:{__svelteCsf:{rawCode:`<!-- the picker anchors to the form; the chip sits below it -->
<div class="relative mt-80 grid w-[32rem]">
	<div class="h-12 rounded-3xl border"></div>

	<ChatFormCurrentWorkingDirectory {...args} />
</div>`}}})}w(c,l),F()}P.__docgen={data:[],name:"ChatFormCurrentWorkingDirectory.stories.svelte"};const n=M(P,I),Ee=["Default","WithDirectory","Disabled","PickerOpen","PickerWithResults","PickerSearching","PickerNoMatch","PickerSearchError","PickerSearchUnavailable"],$e={...n.Default,tags:["svelte-csf-v5"]},We={...n.WithDirectory,tags:["svelte-csf-v5"]},Oe={...n.Disabled,tags:["svelte-csf-v5"]},Fe={...n.PickerOpen,tags:["svelte-csf-v5"]},xe={...n.PickerWithResults,tags:["svelte-csf-v5"]},Re={...n.PickerSearching,tags:["svelte-csf-v5"]},Me={...n.PickerNoMatch,tags:["svelte-csf-v5"]},Te={...n.PickerSearchError,tags:["svelte-csf-v5"]},qe={...n.PickerSearchUnavailable,tags:["svelte-csf-v5"]};export{$e as Default,Oe as Disabled,Me as PickerNoMatch,Fe as PickerOpen,Te as PickerSearchError,qe as PickerSearchUnavailable,Re as PickerSearching,xe as PickerWithResults,We as WithDirectory,Ee as __namedExportsOrder,I as default};
