import{p,c as _,f as h,a as l,d as $,t as y,k as g,g as a,b,e as S}from"./iframe-BxvSZK0j.js";import{c as D,i as G,d as I}from"./create-runtime-stories-DF7OwIoM.js";import{S as x,a as E}from"./StateGalleryItem-BMGszy9q.js";import{e as w}from"./each-DMxlN0HO.js";import"./preload-helper-PPVm8Dsz.js";const C={parameters:{layout:"centered",docs:{description:{component:""}}},title:"Design system/Foundations/Elevation"},{Story:P}=I(),W=[{name:"elevation-inset",note:"fields, recessed"},{name:"elevation-control",note:"buttons and tabs"},{name:"elevation-surface",note:"chat form, cards, sidebar"},{name:"elevation-raised",note:"menus, popovers, dialogs"},{name:"elevation-tooltip",note:"tooltips"}];var k=S('<div class="p-4"><div class="h-20 rounded-card bg-surface-raised"></div></div>');function r(i,d){p(d,!1),G(),P(i,{asChild:!0,name:"Default",children:(m,M)=>{x(m,{columns:5,minItemWidth:"10rem",children:(c,O)=>{var s=_(),v=h(s);w(v,1,()=>W,e=>e.name,(e,t)=>{E(e,{get label(){return a(t).name},get note(){return a(t).note},children:(f,R)=>{var o=k(),u=b(o);let n;y(()=>n=g(u,"",n,{"box-shadow":`var(--${a(t).name??""})`})),l(f,o)},$$slots:{default:!0}})}),l(c,s)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={5} minItemWidth="10rem">
	{#each levels as level (level.name)}
		<StateGalleryItem label={level.name} note={level.note}>
			<div class="p-4">
				<div
					style:box-shadow="var(--{level.name})"
					class="h-20 rounded-card bg-surface-raised"
				></div>
			</div>
		</StateGalleryItem>
	{/each}
</StateGallery>`}}}),$()}r.__docgen={data:[],name:"Elevation.stories.svelte"};const F=D(r,C),H=["Default"],J={...F.Default,tags:["svelte-csf-v5"]};export{J as Default,H as __namedExportsOrder,C as default};
