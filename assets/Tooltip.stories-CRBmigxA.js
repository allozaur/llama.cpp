import{R as l,p as v,f as h,T,s as C,u as g,m as y,a as o,a3 as b,d as x,e as p,b as D}from"./iframe-BxvSZK0j.js";import{c as R,i as B,d as P}from"./create-runtime-stories-DF7OwIoM.js";import{B as z}from"./button-xywSqPau.js";import{C as O}from"./copy-DUPeaLcG.js";import"./preload-helper-PPVm8Dsz.js";import"./this-PF-vsikk.js";import"./Icon-CSRBsjq8.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";const S={component:l,parameters:{layout:"centered"},title:"Design system/Overlays/Tooltip"},{Story:w}=P();var E=p("<!> <!>",1),M=p('<div class="flex h-32 items-end"><!></div>');function n(d,c){v(c,!1),B(),w(d,{asChild:!0,name:"Default",children:(m,k)=>{var e=M(),u=D(e);l(u,{open:!0,children:(f,q)=>{var s=E(),r=h(s);T(r,{child:(i,t)=>{z(i,b(()=>t?.().props,{"aria-label":"Copy",size:"icon",variant:"outline",children:($,F)=>{O($,{})},$$slots:{default:!0}}))},$$slots:{child:!0}});var _=C(r,2);g(_,{children:(a,i)=>{var t=y("Copy to clipboard");o(a,t)},$$slots:{default:!0}}),o(f,s)},$$slots:{default:!0}}),o(m,e)},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<div class="flex h-32 items-end">
	<Tooltip.Root open>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button {...props} aria-label="Copy" size="icon" variant="outline"><Copy /></Button>
			{/snippet}
		</Tooltip.Trigger>

		<Tooltip.Content>Copy to clipboard</Tooltip.Content>
	</Tooltip.Root>
</div>`}}}),x()}n.__docgen={data:[],name:"Tooltip.stories.svelte"};const j=R(n,S),V=["Default"],W={...j.Default,tags:["svelte-csf-v5"]};export{W as Default,V as __namedExportsOrder,S as default};
