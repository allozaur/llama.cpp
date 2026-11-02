import{p as Q,f as h,s as v,m as n,a as e,a3 as x,b as g,d as S,e as m}from"./iframe-BxvSZK0j.js";import{c as U,i as E,d as M}from"./create-runtime-stories-DF7OwIoM.js";import{B as C}from"./button-xywSqPau.js";import{D as B,a as j,b as k,c as q,d as z,e as A,f as G,g as I}from"./drawer-trigger-DQGelv4k.js";import"./preload-helper-PPVm8Dsz.js";import"./this-PF-vsikk.js";import"./clone-D1y8Q09X.js";import"./dialog-content-Bi_qY7pE.js";import"./dialog-description-D6Mb1Tvy.js";const J={component:B,parameters:{layout:"fullscreen"},title:"Design system/Overlays/Drawer"},{Story:K}=M();var y=m("<!> <!>",1),N=m('<div class="mx-auto w-full max-w-sm"><!> <div class="space-y-1 px-4 text-sm"><div class="rounded-md bg-accent px-3 py-2">Qwen3.8-27B</div> <div class="rounded-md px-3 py-2">Llama-3.2-3B</div></div> <!></div>'),V=m('<div class="grid h-screen place-items-center"><!></div>');function P(b,T){Q(T,!1),E(),K(b,{asChild:!0,name:"Default",children:(R,X)=>{var $=V(),F=g($);B(F,{open:!0,children:(H,Y)=>{var _=y(),f=h(_);j(f,{child:(D,r)=>{C(D,x(()=>r?.().props,{variant:"outline",children:(d,t)=>{var i=n("Choose a model");e(d,i)},$$slots:{default:!0}}))},$$slots:{child:!0}});var L=v(f,2);k(L,{children:(w,D)=>{var r=N(),l=g(r);q(l,{children:(t,i)=>{var p=y(),s=h(p);z(s,{children:(a,u)=>{var o=n("Choose a model");e(a,o)},$$slots:{default:!0}});var c=v(s,2);A(c,{children:(a,u)=>{var o=n("Used on phones in place of the dropdown.");e(a,o)},$$slots:{default:!0}}),e(t,p)},$$slots:{default:!0}});var d=v(l,4);G(d,{children:(t,i)=>{I(t,{child:(s,c)=>{C(s,x(()=>c?.().props,{variant:"outline",children:(u,o)=>{var O=n("Close");e(u,O)},$$slots:{default:!0}}))},$$slots:{child:!0}})},$$slots:{default:!0}}),e(w,r)},$$slots:{default:!0}}),e(H,_)},$$slots:{default:!0}}),e(R,$)},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<div class="grid h-screen place-items-center">
	<Drawer.Root open>
		<Drawer.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="outline">Choose a model</Button>
			{/snippet}
		</Drawer.Trigger>

		<Drawer.Content>
			<div class="mx-auto w-full max-w-sm">
				<Drawer.Header>
					<Drawer.Title>Choose a model</Drawer.Title>

					<Drawer.Description>Used on phones in place of the dropdown.</Drawer.Description>
				</Drawer.Header>

				<div class="space-y-1 px-4 text-sm">
					<div class="rounded-md bg-accent px-3 py-2">Qwen3.8-27B</div>

					<div class="rounded-md px-3 py-2">Llama-3.2-3B</div>
				</div>

				<Drawer.Footer>
					<Drawer.Close>
						{#snippet child({ props })}
							<Button {...props} variant="outline">Close</Button>
						{/snippet}
					</Drawer.Close>
				</Drawer.Footer>
			</div>
		</Drawer.Content>
	</Drawer.Root>
</div>`}}}),S()}P.__docgen={data:[],name:"Drawer.stories.svelte"};const W=U(P,J),de=["Default"],ie={...W.Default,tags:["svelte-csf-v5"]};export{ie as Default,de as __namedExportsOrder,J as default};
