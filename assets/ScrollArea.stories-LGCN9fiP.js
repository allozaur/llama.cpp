import{p as S,s as l,b as n,a as c,d as $,e as i,f as g,t as x,h as y,g as D}from"./iframe-BxvSZK0j.js";import{c as b,i as A,d as C}from"./create-runtime-stories-DF7OwIoM.js";import{S as d}from"./scroll-area-CP3kH8ff.js";import{S as w}from"./separator-DEWw0QPu.js";import{e as P}from"./each-DMxlN0HO.js";import"./preload-helper-PPVm8Dsz.js";const E={component:d,parameters:{layout:"centered"},title:"Design system/Display/ScrollArea"},{Story:M}=C(),O=Array.from({length:30},(t,s)=>`Conversation ${s+1}`);var R=i('<div class="text-sm"> </div> <!>',1),j=i('<div class="p-4"><h4 class="mb-4 text-sm font-medium">Conversations</h4> <!></div>');function m(t,s){S(s,!1),A(),M(t,{asChild:!0,name:"Default",children:(f,q)=>{d(f,{class:"h-72 w-56 rounded-md border",children:(p,z)=>{var e=j(),v=l(n(e),2);P(v,1,()=>O,a=>a,(a,h)=>{var r=R(),o=g(r),_=n(o),u=l(o,2);w(u,{class:"my-2"}),x(()=>y(_,D(h))),c(a,r)}),c(p,e)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<ScrollArea class="h-72 w-56 rounded-md border">
	<div class="p-4">
		<h4 class="mb-4 text-sm font-medium">Conversations</h4>

		{#each chats as chat (chat)}
			<div class="text-sm">{chat}</div>

			<Separator class="my-2" />
		{/each}
	</div>
</ScrollArea>`}}}),$()}m.__docgen={data:[],name:"ScrollArea.stories.svelte"};const k=b(m,E),K=["Default"],L={...k.Default,tags:["svelte-csf-v5"]};export{L as Default,K as __namedExportsOrder,E as default};
