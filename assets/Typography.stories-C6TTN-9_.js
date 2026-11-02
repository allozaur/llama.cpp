import{p as D,a as c,d as T,e as m,b as e,s as n,t as k,h as o,g as a,i as S,j as C}from"./iframe-BxvSZK0j.js";import{c as q,i as A,d as j}from"./create-runtime-stories-DF7OwIoM.js";import{e as E}from"./each-DMxlN0HO.js";import"./preload-helper-PPVm8Dsz.js";const F={parameters:{layout:"centered",docs:{description:{component:""}}},title:"Design system/Foundations/Typography"},{Story:M}=j(),O=[{name:"text-heading",spec:"24/32 600",use:"rare page headings"},{name:"text-title",spec:"18/28 600",use:"dialog and section titles"},{name:"text-body",spec:"16/24 400",use:"chat messages and the chat input"},{name:"text-body-sm",spec:"14/20 400",use:"most text, fields and lists"},{name:"text-label",spec:"14/20 500",use:"buttons and field labels"},{name:"text-label-sm",spec:"12/16 500",use:"badges and compact labels"},{name:"text-caption",spec:"12/16 400",use:"tooltips, hints and metadata"}];var P=m('<div class="grid grid-cols-[9rem_1fr] items-baseline gap-6"><div class="flex flex-col gap-0.5 font-mono text-[11px] text-muted-foreground"><span> </span> <span class="opacity-70"> </span></div> <div class="flex flex-col gap-1"><span>The quick brown llama runs locally</span> <span class="text-caption text-fg-muted"> </span></div></div>'),R=m('<div class="w-[min(52rem,calc(100vw-2rem))] space-y-6 p-4"><!> <div class="grid grid-cols-[9rem_1fr] items-baseline gap-6"><span class="font-mono text-[11px] text-muted-foreground">text-fg-muted</span> <span class="text-body-sm text-fg-muted">Secondary text and hints</span></div> <div class="grid grid-cols-[9rem_1fr] items-baseline gap-6"><span class="font-mono text-[11px] text-muted-foreground">font-mono</span> <code class="font-mono text-body-sm">llama-server -m model.gguf --port 8080</code></div> <div class="grid grid-cols-[9rem_1fr] items-baseline gap-6"><span class="font-mono text-[11px] text-muted-foreground">engraved</span> <span class="text-body text-fg-muted engraved">Ask anything...</span></div></div>');function g(f,x){D(x,!1),A(),M(f,{asChild:!0,name:"Default",children:(v,B)=>{var d=R(),u=e(d);E(u,1,()=>O,t=>t.name,(t,s)=>{var r=P(),l=e(r),i=e(l),_=e(i),y=n(i,2),b=e(y),h=n(l,2),p=e(h),w=n(p,2),$=e(w);k(()=>{o(_,a(s).name),o(b,a(s).spec),S(p,1,C(a(s).name)),o($,a(s).use)}),c(t,r)}),c(v,d)},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<div class="w-[min(52rem,calc(100vw-2rem))] space-y-6 p-4">
	{#each roles as role (role.name)}
		<div class="grid grid-cols-[9rem_1fr] items-baseline gap-6">
			<div class="flex flex-col gap-0.5 font-mono text-[11px] text-muted-foreground">
				<span>{role.name}</span>

				<span class="opacity-70">{role.spec}</span>
			</div>

			<div class="flex flex-col gap-1">
				<span class={role.name}>The quick brown llama runs locally</span>

				<span class="text-caption text-fg-muted">{role.use}</span>
			</div>
		</div>
	{/each}

	<div class="grid grid-cols-[9rem_1fr] items-baseline gap-6">
		<span class="font-mono text-[11px] text-muted-foreground">text-fg-muted</span>

		<span class="text-body-sm text-fg-muted">Secondary text and hints</span>
	</div>

	<div class="grid grid-cols-[9rem_1fr] items-baseline gap-6">
		<span class="font-mono text-[11px] text-muted-foreground">font-mono</span>

		<code class="font-mono text-body-sm">llama-server -m model.gguf --port 8080</code>
	</div>

	<div class="grid grid-cols-[9rem_1fr] items-baseline gap-6">
		<span class="font-mono text-[11px] text-muted-foreground">engraved</span>

		<span class="text-body text-fg-muted engraved">Ask anything...</span>
	</div>
</div>`}}}),T()}g.__docgen={data:[],name:"Typography.stories.svelte"};const z=q(g,F),K=["Default"],L={...z.Default,tags:["svelte-csf-v5"]};export{L as Default,K as __namedExportsOrder,F as default};
