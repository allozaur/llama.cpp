import{p as E,f as c,s as r,m as s,a as t,a3 as w,b as C,d as M,e as f}from"./iframe-BxvSZK0j.js";import{c as j,i as q,d as z}from"./create-runtime-stories-DF7OwIoM.js";import{B as g}from"./button-xywSqPau.js";import{R as y,D as A,a as G,b as J,c as K,d as Q,e as U,f as V}from"./index-DwS4Awyr.js";import{I as W}from"./input-CLr4-AYd.js";import{L as X}from"./label-2OikHIdw.js";import"./preload-helper-PPVm8Dsz.js";import"./this-PF-vsikk.js";import"./dialog-content-Bi_qY7pE.js";import"./dialog-description-D6Mb1Tvy.js";import"./library.constants-v9JM2Zdd.js";import"./info-Cb5cGIZT.js";import"./Icon-CSRBsjq8.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";import"./ui.enums-DjR_vYxk.js";import"./settings-vDMD8fT9.js";import"./wrench-C98Yxdx8.js";import"./css-classes.constants-B-GZedvn.js";import"./x-DXCCWZ3I.js";import"./input-BVFa53i-.js";const Y={component:y,parameters:{layout:"fullscreen"},title:"Design system/Overlays/Dialog"},{Story:Z}=z();var _=f("<!> <!>",1),tt=f('<!> <div class="grid gap-2"><!> <!></div> <!>',1),et=f('<div class="grid h-screen place-items-center"><!></div>');function B(T,L){E(L,!1),q(),Z(T,{asChild:!0,name:"Default",children:(S,at)=>{var h=et(),I=C(h);y(I,{open:!0,children:(k,rt)=>{var D=_(),x=c(D);A(x,{child:(R,l)=>{g(R,w(()=>l?.().props,{variant:"outline",children:(d,u)=>{var v=s("Rename conversation");t(d,v)},$$slots:{default:!0}}))},$$slots:{child:!0}});var F=r(x,2);G(F,{class:"sm:max-w-md",children:(P,R)=>{var l=tt(),m=c(l);J(m,{children:(n,b)=>{var e=_(),i=c(e);K(i,{children:(a,p)=>{var o=s("Rename conversation");t(a,o)},$$slots:{default:!0}});var $=r(i,2);Q($,{children:(a,p)=>{var o=s("The new name shows in the sidebar and in search.");t(a,o)},$$slots:{default:!0}}),t(n,e)},$$slots:{default:!0}});var d=r(m,2),u=C(d);X(u,{for:"story-dialog-name",children:(n,b)=>{var e=s("Name");t(n,e)},$$slots:{default:!0}});var v=r(u,2);W(v,{id:"story-dialog-name",value:"Rust borrow checker"});var H=r(d,2);U(H,{children:(n,b)=>{var e=_(),i=c(e);V(i,{child:(p,o)=>{g(p,w(()=>o?.().props,{variant:"outline",children:(N,nt)=>{var O=s("Cancel");t(N,O)},$$slots:{default:!0}}))},$$slots:{child:!0}});var $=r(i,2);g($,{children:(a,p)=>{var o=s("Save");t(a,o)},$$slots:{default:!0}}),t(n,e)},$$slots:{default:!0}}),t(P,l)},$$slots:{default:!0}}),t(k,D)},$$slots:{default:!0}}),t(S,h)},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<div class="grid h-screen place-items-center">
	<Dialog.Root open>
		<Dialog.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="outline">Rename conversation</Button>
			{/snippet}
		</Dialog.Trigger>

		<Dialog.Content class="sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Rename conversation</Dialog.Title>

				<Dialog.Description>The new name shows in the sidebar and in search.</Dialog.Description>
			</Dialog.Header>

			<div class="grid gap-2">
				<Label for="story-dialog-name">Name</Label>

				<Input id="story-dialog-name" value="Rust borrow checker" />
			</div>

			<Dialog.Footer>
				<Dialog.Close>
					{#snippet child({ props })}
						<Button {...props} variant="outline">Cancel</Button>
					{/snippet}
				</Dialog.Close>

				<Button>Save</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>`}}}),M()}B.__docgen={data:[],name:"Dialog.stories.svelte"};const ot=j(B,Y),Bt=["Default"],Tt={...ot.Default,tags:["svelte-csf-v5"]};export{Tt as Default,Bt as __namedExportsOrder,Y as default};
