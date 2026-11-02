import{p as I,f as w,s as o,b as r,m as l,a as t,a3 as R,d as O,e as d}from"./iframe-BxvSZK0j.js";import{c as E,i as M,d as j}from"./create-runtime-stories-DF7OwIoM.js";import{B as k}from"./button-xywSqPau.js";import{I as $}from"./input-CLr4-AYd.js";import{L as h}from"./label-2OikHIdw.js";import{P,a as q,b as z}from"./popover-trigger-DEKMn7ku.js";import"./preload-helper-PPVm8Dsz.js";import"./this-PF-vsikk.js";import"./input-BVFa53i-.js";import"./floating-layer-anchor-DpndBh7P.js";const A={component:P,parameters:{layout:"centered"},title:"Design system/Overlays/Popover"},{Story:F}=j();var G=d('<div class="grid gap-3"><p class="text-sm font-medium">Sampling</p> <div class="grid grid-cols-3 items-center gap-2"><!> <!></div> <div class="grid grid-cols-3 items-center gap-2"><!> <!></div></div>'),H=d("<!> <!>",1),J=d('<div class="h-72"><!></div>');function y(b,x){I(x,!1),M(),F(b,{asChild:!0,name:"Default",children:(D,N)=>{var v=J(),L=r(v);P(L,{open:!0,children:(S,Q)=>{var c=H(),m=w(c);q(m,{child:(f,s)=>{k(f,R(()=>s?.().props,{variant:"outline",children:(e,_)=>{var n=l("Sampling");t(e,n)},$$slots:{default:!0}}))},$$slots:{child:!0}});var T=o(m,2);z(T,{class:"w-72",children:(u,f)=>{var s=G(),a=o(r(s),2),e=r(a);h(e,{for:"story-temp",children:(p,B)=>{var i=l("Temperature");t(p,i)},$$slots:{default:!0}});var _=o(e,2);$(_,{class:"col-span-2 h-8",id:"story-temp",value:"0.8"});var n=o(a,2),g=r(n);h(g,{for:"story-top-p",children:(p,B)=>{var i=l("Top P");t(p,i)},$$slots:{default:!0}});var C=o(g,2);$(C,{class:"col-span-2 h-8",id:"story-top-p",value:"0.95"}),t(u,s)},$$slots:{default:!0}}),t(S,c)},$$slots:{default:!0}}),t(D,v)},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<div class="h-72">
	<Popover.Root open>
		<Popover.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="outline">Sampling</Button>
			{/snippet}
		</Popover.Trigger>

		<Popover.Content class="w-72">
			<div class="grid gap-3">
				<p class="text-sm font-medium">Sampling</p>

				<div class="grid grid-cols-3 items-center gap-2">
					<Label for="story-temp">Temperature</Label>

					<Input class="col-span-2 h-8" id="story-temp" value="0.8" />
				</div>

				<div class="grid grid-cols-3 items-center gap-2">
					<Label for="story-top-p">Top P</Label>

					<Input class="col-span-2 h-8" id="story-top-p" value="0.95" />
				</div>
			</div>
		</Popover.Content>
	</Popover.Root>
</div>`}}}),O()}y.__docgen={data:[],name:"Popover.stories.svelte"};const K=E(y,A),rt=["Default"],at={...K.Default,tags:["svelte-csf-v5"]};export{at as Default,rt as __namedExportsOrder,A as default};
