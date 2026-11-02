import{p as w,f as G,a,s as r,d as I,e as s}from"./iframe-BxvSZK0j.js";import{c as k,i as P,d as z}from"./create-runtime-stories-DF7OwIoM.js";import{S as D,a as l}from"./StateGalleryItem-BMGszy9q.js";import"./preload-helper-PPVm8Dsz.js";const C={parameters:{layout:"centered",docs:{description:{component:""}}},title:"Design system/Foundations/Surfaces"},{Story:j}=z();var A=s('<div class="matte-glass h-28 rounded-3xl"></div>'),M=s('<div class="matte-glass flex h-28 items-center rounded-3xl px-4"><input class="w-full bg-transparent text-sm outline-none placeholder:engraved" placeholder="Click to see the focus edge"/></div>'),E=s('<div class="sidebar-surface flex h-28 flex-col justify-end rounded-(--sidebar-radius) p-2"><div class="inset-group-surface flex flex-col gap-1 p-1 text-sm"><span class="rounded-md px-2 py-1">Models</span> <span class="rounded-md px-2 py-1">Settings</span></div></div>'),F=s('<div class="matte-float h-28 rounded-xl border"></div>'),O=s('<div class="flex h-28 items-center justify-center gap-3"><div class="matte-key size-10 rounded-full bg-background"></div> <div class="matte-key h-9 w-24 rounded-md bg-secondary"></div></div>'),R=s('<div class="flex h-28 items-center"><div class="matte-well h-9 w-full rounded-md border border-input bg-background"></div></div>'),q=s('<div class="flex h-28 items-center gap-2"><span class="matte-chip rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">chip</span> <span class="matte-chip rounded-md bg-primary px-2 py-0.5 text-xs text-primary-foreground">chip</span></div>'),B=s('<div class="matte-sheen flex h-28 items-center rounded-2xl bg-primary/5 px-4 text-sm">A user message</div>'),H=s('<div class="flex h-28 items-center text-sm text-muted-foreground engraved">Ask anything...</div>'),J=s('<div class="flex h-28 items-center gap-4"><span class="status-lamp orb-danger"></span> <span class="status-lamp orb-warning"></span> <span class="status-lamp orb-success"></span></div>'),K=s('<div class="flex h-28 items-center gap-4"><span class="matte-orb orb-danger size-8 rounded-full"></span> <span class="matte-orb orb-warning size-8 rounded-full"></span> <span class="matte-orb orb-success size-8 rounded-full"></span></div>'),L=s("<!> <!> <!> <!> <!> <!> <!> <!> <!> <!> <!>",1);function h(x,y){w(y,!1),P(),j(x,{asChild:!0,name:"Default",children:($,Q)=>{D($,{columns:3,children:(_,T)=>{var d=L(),o=G(d);l(o,{label:"matte-glass",note:"chat form, cards",children:(e,n)=>{var t=A();a(e,t)},$$slots:{default:!0}});var i=r(o,2);l(i,{label:"matte-glass",note:"focus within",children:(e,n)=>{var t=M();a(e,t)},$$slots:{default:!0}});var c=r(i,2);l(c,{label:"inset-group-surface",note:"rows grouped in a glass panel",children:(e,n)=>{var t=E();a(e,t)},$$slots:{default:!0}});var p=r(c,2);l(p,{label:"matte-float",note:"menus, popovers, dialogs",children:(e,n)=>{var t=F();a(e,t)},$$slots:{default:!0}});var u=r(p,2);l(u,{label:"matte-key",note:"buttons keep their own fill",children:(e,n)=>{var t=O();a(e,t)},$$slots:{default:!0}});var m=r(u,2);l(m,{label:"matte-well",note:"inputs, switches",children:(e,n)=>{var t=R();a(e,t)},$$slots:{default:!0}});var v=r(m,2);l(v,{label:"matte-chip",note:"badges",children:(e,n)=>{var t=q();a(e,t)},$$slots:{default:!0}});var f=r(v,2);l(f,{label:"matte-sheen",note:"user message bubble",children:(e,n)=>{var t=B();a(e,t)},$$slots:{default:!0}});var g=r(f,2);l(g,{label:"engraved",note:"placeholder text",children:(e,n)=>{var t=H();a(e,t)},$$slots:{default:!0}});var b=r(g,2);l(b,{label:"status-lamp",note:"red, yellow, green",children:(e,n)=>{var t=J();a(e,t)},$$slots:{default:!0}});var S=r(b,2);l(S,{label:"matte-orb",note:"recording button",children:(e,n)=>{var t=K();a(e,t)},$$slots:{default:!0}}),a(_,d)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={3}>
	<StateGalleryItem label="matte-glass" note="chat form, cards">
		<div class="matte-glass h-28 rounded-3xl"></div>
	</StateGalleryItem>

	<StateGalleryItem label="matte-glass" note="focus within">
		<div class="matte-glass flex h-28 items-center rounded-3xl px-4">
			<input
				class="w-full bg-transparent text-sm outline-none placeholder:engraved"
				placeholder="Click to see the focus edge"
			/>
		</div>
	</StateGalleryItem>

	<StateGalleryItem label="inset-group-surface" note="rows grouped in a glass panel">
		<!-- shown inside a sidebar-surface, the only place it reads as intended -->
		<div class="sidebar-surface flex h-28 flex-col justify-end rounded-(--sidebar-radius) p-2">
			<div class="inset-group-surface flex flex-col gap-1 p-1 text-sm">
				<span class="rounded-md px-2 py-1">Models</span>

				<span class="rounded-md px-2 py-1">Settings</span>
			</div>
		</div>
	</StateGalleryItem>

	<StateGalleryItem label="matte-float" note="menus, popovers, dialogs">
		<div class="matte-float h-28 rounded-xl border"></div>
	</StateGalleryItem>

	<StateGalleryItem label="matte-key" note="buttons keep their own fill">
		<div class="flex h-28 items-center justify-center gap-3">
			<div class="matte-key size-10 rounded-full bg-background"></div>

			<div class="matte-key h-9 w-24 rounded-md bg-secondary"></div>
		</div>
	</StateGalleryItem>

	<StateGalleryItem label="matte-well" note="inputs, switches">
		<div class="flex h-28 items-center">
			<div class="matte-well h-9 w-full rounded-md border border-input bg-background"></div>
		</div>
	</StateGalleryItem>

	<StateGalleryItem label="matte-chip" note="badges">
		<div class="flex h-28 items-center gap-2">
			<span class="matte-chip rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">chip</span>

			<span class="matte-chip rounded-md bg-primary px-2 py-0.5 text-xs text-primary-foreground"
				>chip</span
			>
		</div>
	</StateGalleryItem>

	<StateGalleryItem label="matte-sheen" note="user message bubble">
		<div class="matte-sheen flex h-28 items-center rounded-2xl bg-primary/5 px-4 text-sm">
			A user message
		</div>
	</StateGalleryItem>

	<StateGalleryItem label="engraved" note="placeholder text">
		<div class="flex h-28 items-center text-sm text-muted-foreground engraved">
			Ask anything...
		</div>
	</StateGalleryItem>

	<StateGalleryItem label="status-lamp" note="red, yellow, green">
		<div class="flex h-28 items-center gap-4">
			<span class="status-lamp orb-danger"></span>

			<span class="status-lamp orb-warning"></span>

			<span class="status-lamp orb-success"></span>
		</div>
	</StateGalleryItem>

	<StateGalleryItem label="matte-orb" note="recording button">
		<div class="flex h-28 items-center gap-4">
			<span class="matte-orb orb-danger size-8 rounded-full"></span>

			<span class="matte-orb orb-warning size-8 rounded-full"></span>

			<span class="matte-orb orb-success size-8 rounded-full"></span>
		</div>
	</StateGalleryItem>
</StateGallery>`}}}),I()}h.__docgen={data:[],name:"Surfaces.stories.svelte"};const N=k(h,C),Y=["Default"],Z={...N.Default,tags:["svelte-csf-v5"]};export{Z as Default,Y as __namedExportsOrder,C as default};
