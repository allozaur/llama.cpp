import{a3 as d,w as u,p as f,a,d as _,e as l,b as $}from"./iframe-BxvSZK0j.js";import{c as v,i as b,d as h}from"./create-runtime-stories-DF7OwIoM.js";import{C as i}from"./CollapsibleTerminalBlock-DKIuhqts.js";import{I as k}from"./Icon-CSRBsjq8.js";import"./preload-helper-PPVm8Dsz.js";import"./collapsible-trigger-DIE3Fs9m.js";import"./library.constants-v9JM2Zdd.js";import"./info-Cb5cGIZT.js";import"./ui.enums-DjR_vYxk.js";import"./settings-vDMD8fT9.js";import"./wrench-C98Yxdx8.js";import"./css-classes.constants-B-GZedvn.js";import"./chevron-down-D7MPUDbV.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";var g=new Set(["$$slots","$$events","$$legacy"]);function w(e,t){let o=u(t,g);const r={name:"square-terminal",size:24,node:[["path",{d:"m7 11 2-2-2-2"}],["path",{d:"M11 13h4"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}]],aliases:["terminal-square"]};k(e,d(()=>o,{get icon(){return r}}))}const x={component:i,parameters:{layout:"centered"},title:"Content/CollapsibleTerminalBlock"},{Story:C}=h();var T=l(`<pre class="p-3 font-mono text-xs">running 3 tests
test borrow::longest ... ok
test borrow::shorter ... ok
test borrow::equal ... ok

test result: ok. 3 passed; 0 failed</pre>`),q=l('<div class="w-[36rem]"><!></div>');function n(e,t){f(t,!1),b(),C(e,{asChild:!0,name:"Default",children:(o,r)=>{var s=q(),p=$(s);i(p,{get icon(){return w},open:!0,subtitle:"exit 0",title:"cargo test",children:(m,D)=>{var c=T();a(m,c)},$$slots:{default:!0}}),a(o,s)},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<div class="w-[36rem]">
	<CollapsibleTerminalBlock icon={SquareTerminal} open subtitle="exit 0" title="cargo test">
		<pre class="p-3 font-mono text-xs">running 3 tests
test borrow::longest ... ok
test borrow::shorter ... ok
test borrow::equal ... ok

test result: ok. 3 passed; 0 failed</pre>
	</CollapsibleTerminalBlock>
</div>`}}}),_()}n.__docgen={data:[],name:"CollapsibleTerminalBlock.stories.svelte"};const B=v(n,x),K=["Default"],L={...B.Default,tags:["svelte-csf-v5"]};export{L as Default,K as __namedExportsOrder,x as default};
