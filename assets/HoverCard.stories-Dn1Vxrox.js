import{p as g,f as $,s as C,a as e,v as H,d as x,e as t,b as Q}from"./iframe-BxvSZK0j.js";import{c as w,i as y,d as B}from"./create-runtime-stories-DF7OwIoM.js";import{H as l,a as D,b as G}from"./hover-card-trigger-46ZsC1b5.js";import"./preload-helper-PPVm8Dsz.js";import"./mounted-DosV_eyV.js";import"./floating-layer-anchor-DpndBh7P.js";const b={component:l,parameters:{layout:"centered"},title:"Design system/Overlays/HoverCard"},{Story:M}=B();var P=t("<a>ggml-org/Qwen3.8-27B-GGUF</a>"),R=t('<div class="space-y-1"><p class="text-sm font-medium">Qwen3.8-27B</p> <p class="text-sm text-muted-foreground">131k context, tool use and vision. Quantized to Q4_K_M, 16.4 GB.</p></div>'),k=t("<!> <!>",1),z=t('<div class="h-56"><!></div>');function c(v,p){g(p,!1),y(),M(v,{asChild:!0,name:"Default",children:(m,K)=>{var s=z(),u=Q(s);l(u,{open:!0,children:(f,O)=>{var o=k(),a=$(o);D(a,{child:(d,r)=>{let h=()=>r?.().props;var i=P();H(i,()=>({...h(),class:"text-sm underline-offset-4 hover:underline",href:"#hover-card"})),e(d,i)},$$slots:{child:!0}});var _=C(a,2);G(_,{class:"w-72",children:(n,d)=>{var r=R();e(n,r)},$$slots:{default:!0}}),e(f,o)},$$slots:{default:!0}}),e(m,s)},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<div class="h-56">
	<HoverCard.Root open>
		<HoverCard.Trigger>
			{#snippet child({ props })}
				<a {...props} class="text-sm underline-offset-4 hover:underline" href="#hover-card"
					>ggml-org/Qwen3.8-27B-GGUF</a
				>
			{/snippet}
		</HoverCard.Trigger>

		<HoverCard.Content class="w-72">
			<div class="space-y-1">
				<p class="text-sm font-medium">Qwen3.8-27B</p>

				<p class="text-sm text-muted-foreground">
					131k context, tool use and vision. Quantized to Q4_K_M, 16.4 GB.
				</p>
			</div>
		</HoverCard.Content>
	</HoverCard.Root>
</div>`}}}),x()}c.__docgen={data:[],name:"HoverCard.stories.svelte"};const F=w(c,b),A=["Default"],I={...F.Default,tags:["svelte-csf-v5"]};export{I as Default,A as __namedExportsOrder,b as default};
