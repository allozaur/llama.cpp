import{p as P,f as j,a as d,s as r,d as k,e as p,t as g,i as E,g as a,h as x,b as s,k as F}from"./iframe-BxvSZK0j.js";import{c as M,i as O,d as R}from"./create-runtime-stories-DF7OwIoM.js";import{S as q,a as u}from"./StateGalleryItem-BMGszy9q.js";import{e as _}from"./each-DMxlN0HO.js";import{S as A}from"./settings-vDMD8fT9.js";import"./preload-helper-PPVm8Dsz.js";import"./Icon-CSRBsjq8.js";import"./svelte-element-BAftWIbD.js";const B={parameters:{layout:"centered",docs:{description:{component:""}}},title:"Design system/Foundations/Sizing"},{Story:H}=R(),J=[{name:"h-control-sm",note:"32px"},{name:"h-control-md",note:"36px, default"},{name:"h-control-lg",note:"40px"}],K=[{name:"size-icon-xs",note:"12px"},{name:"size-icon-sm",note:"14px"},{name:"size-icon-md",note:"16px, default"},{name:"size-icon-lg",note:"20px"}],L=[{name:"xs",px:4},{name:"sm",px:8},{name:"md",px:12},{name:"lg",px:16},{name:"xl",px:24},{name:"2xl",px:32}];var N=p('<div class="flex flex-col items-center gap-2"><div></div> <span class="font-mono text-[11px] text-fg-muted"> </span> <span class="text-caption text-fg-muted"> </span></div>'),Q=p('<div class="flex items-end gap-3"></div>'),T=p('<div class="flex flex-col items-center gap-2"><!> <span class="font-mono text-[11px] text-fg-muted"> </span> <span class="text-caption text-fg-muted"> </span></div>'),U=p('<div class="flex items-end gap-5"></div>'),V=p('<div class="flex items-center gap-3"><span class="w-8 font-mono text-[11px] text-fg-muted"> </span> <div class="h-3 rounded-sm bg-muted-foreground/40"></div> <span class="text-caption text-fg-muted"> </span></div>'),W=p('<div class="flex flex-col gap-2"></div>'),X=p("<!> <!> <!>",1);function b(G,z){P(z,!1),O(),H(G,{asChild:!0,name:"Default",children:(I,Z)=>{q(I,{columns:1,children:(w,ee)=>{var h=X(),$=j(h);u($,{label:"Control heights",children:(v,y)=>{var n=Q();_(n,5,()=>J,e=>e.name,(e,t)=>{var o=N(),l=s(o),i=r(l,2),c=s(i),m=r(i,2),f=s(m);g(()=>{E(l,1,`flex w-20 items-center justify-center rounded-control border border-line-default bg-surface-muted ${a(t).name??""}`),x(c,a(t).name),x(f,a(t).note)}),d(e,o)}),d(v,n)},$$slots:{default:!0}});var S=r($,2);u(S,{label:"Icon sizes",children:(v,y)=>{var n=U();_(n,5,()=>K,e=>e.name,(e,t)=>{var o=T(),l=s(o);A(l,{get class(){return a(t).name}});var i=r(l,2),c=s(i),m=r(i,2),f=s(m);g(()=>{x(c,a(t).name),x(f,a(t).note)}),d(e,o)}),d(v,n)},$$slots:{default:!0}});var D=r(S,2);u(D,{label:"Spacing",note:"4px grid",children:(v,y)=>{var n=W();_(n,5,()=>L,e=>e.name,(e,t)=>{var o=V(),l=s(o),i=s(l),c=r(l,2);let m;var f=r(c,2),C=s(f);g(()=>{x(i,a(t).name),m=F(c,"",m,{width:`${a(t).px??""}px`}),x(C,`${a(t).px??""}px`)}),d(e,o)}),d(v,n)},$$slots:{default:!0}}),d(w,h)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={1}>
	<StateGalleryItem label="Control heights">
		<div class="flex items-end gap-3">
			{#each heights as height (height.name)}
				<div class="flex flex-col items-center gap-2">
					<div
						class="flex w-20 items-center justify-center rounded-control border border-line-default bg-surface-muted {height.name}"
					></div>

					<span class="font-mono text-[11px] text-fg-muted">{height.name}</span>

					<span class="text-caption text-fg-muted">{height.note}</span>
				</div>
			{/each}
		</div>
	</StateGalleryItem>

	<StateGalleryItem label="Icon sizes">
		<div class="flex items-end gap-5">
			{#each icons as icon (icon.name)}
				<div class="flex flex-col items-center gap-2">
					<Settings class={icon.name} />

					<span class="font-mono text-[11px] text-fg-muted">{icon.name}</span>

					<span class="text-caption text-fg-muted">{icon.note}</span>
				</div>
			{/each}
		</div>
	</StateGalleryItem>

	<StateGalleryItem label="Spacing" note="4px grid">
		<div class="flex flex-col gap-2">
			{#each spacing as step (step.name)}
				<div class="flex items-center gap-3">
					<span class="w-8 font-mono text-[11px] text-fg-muted">{step.name}</span>

					<div style:width="{step.px}px" class="h-3 rounded-sm bg-muted-foreground/40"></div>

					<span class="text-caption text-fg-muted">{step.px}px</span>
				</div>
			{/each}
		</div>
	</StateGalleryItem>
</StateGallery>`}}}),k()}b.__docgen={data:[],name:"Sizing.stories.svelte"};const Y=M(b,B),de=["Default"],pe={...Y.Default,tags:["svelte-csf-v5"]};export{pe as Default,de as __namedExportsOrder,B as default};
