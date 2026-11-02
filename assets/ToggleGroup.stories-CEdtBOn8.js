import{a3 as P,w as S,p as N,f,s as n,a,m as h,d as W,e as I,g as E}from"./iframe-BxvSZK0j.js";import{c as O,i as j,d as q}from"./create-runtime-stories-DF7OwIoM.js";import{S as B,a as G}from"./StateGalleryItem-BMGszy9q.js";import{T as _,a as r}from"./toggle-group-item-BeZEKUxW.js";import{e as F}from"./each-DMxlN0HO.js";import{I as x}from"./Icon-CSRBsjq8.js";import"./preload-helper-PPVm8Dsz.js";import"./toggle-BbwUMDz5.js";import"./svelte-element-BAftWIbD.js";var J=new Set(["$$slots","$$events","$$legacy"]);function K(d,$){let m=S($,J);const v={name:"text-align-center",size:24,node:[["path",{d:"M21 5H3"}],["path",{d:"M17 12H7"}],["path",{d:"M19 19H5"}]],aliases:["align-center"]};x(d,P(()=>m,{get icon(){return v}}))}var Q=new Set(["$$slots","$$events","$$legacy"]);function y(d,$){let m=S($,Q);const v={name:"text-align-end",size:24,node:[["path",{d:"M21 5H3"}],["path",{d:"M21 12H9"}],["path",{d:"M21 19H7"}]],aliases:["align-right"]};x(d,P(()=>m,{get icon(){return v}}))}var U=new Set(["$$slots","$$events","$$legacy"]);function b(d,$){let m=S($,U);const v={name:"text-align-start",size:24,node:[["path",{d:"M21 5H3"}],["path",{d:"M15 12H3"}],["path",{d:"M17 19H3"}]],aliases:["text","align-left"]};x(d,P(()=>m,{get icon(){return v}}))}const X={component:_,parameters:{layout:"centered"},title:"Design system/Actions/ToggleGroup"},{Story:Y}=q(),Z=["icon-sm","icon","icon-lg"];var A=I("<!> <!> <!>",1),w=I("<!> <!>",1),ee=I('<div class="flex items-center gap-3"></div>'),te=I("<!> <!> <!> <!> <!>",1);function C(d,$){N($,!1),j(),Y(d,{asChild:!0,name:"Default",children:(m,v)=>{B(m,{columns:2,minItemWidth:"16rem",children:(V,oe)=>{var z=te(),R=f(z);G(R,{label:"Single",note:"icons",children:(p,T)=>{_(p,{size:"icon-sm",type:"single",value:"center",children:(u,c)=>{var l=A(),o=f(l);r(o,{"aria-label":"Align left",value:"left",children:(e,g)=>{b(e,{})},$$slots:{default:!0}});var i=n(o,2);r(i,{"aria-label":"Align center",value:"center",children:(e,g)=>{K(e,{})},$$slots:{default:!0}});var s=n(i,2);r(s,{"aria-label":"Align right",value:"right",children:(e,g)=>{y(e,{})},$$slots:{default:!0}}),a(u,l)},$$slots:{default:!0}})},$$slots:{default:!0}});var M=n(R,2);G(M,{label:"Nothing pressed",children:(p,T)=>{_(p,{type:"multiple",value:[],children:(u,c)=>{var l=A(),o=f(l);r(o,{value:"tools",children:(e,g)=>{var t=h("Tools");a(e,t)},$$slots:{default:!0}});var i=n(o,2);r(i,{value:"vision",children:(e,g)=>{var t=h("Vision");a(e,t)},$$slots:{default:!0}});var s=n(i,2);r(s,{value:"audio",children:(e,g)=>{var t=h("Audio");a(e,t)},$$slots:{default:!0}}),a(u,l)},$$slots:{default:!0}})},$$slots:{default:!0}});var D=n(M,2);G(D,{label:"Multiple",note:"the unpressed keys mute",children:(p,T)=>{_(p,{type:"multiple",value:["tools","vision"],children:(u,c)=>{var l=A(),o=f(l);r(o,{value:"tools",children:(e,g)=>{var t=h("Tools");a(e,t)},$$slots:{default:!0}});var i=n(o,2);r(i,{value:"vision",children:(e,g)=>{var t=h("Vision");a(e,t)},$$slots:{default:!0}});var s=n(i,2);r(s,{value:"audio",children:(e,g)=>{var t=h("Audio");a(e,t)},$$slots:{default:!0}}),a(u,l)},$$slots:{default:!0}})},$$slots:{default:!0}});var H=n(D,2);G(H,{label:"Sizes",note:"icon-sm, icon, icon-lg",children:(p,T)=>{var u=ee();F(u,5,()=>Z,c=>c,(c,l)=>{_(c,{get size(){return E(l)},type:"single",value:"left",children:(o,i)=>{var s=w(),e=f(s);r(e,{"aria-label":"Align left",value:"left",children:(t,k)=>{b(t,{})},$$slots:{default:!0}});var g=n(e,2);r(g,{"aria-label":"Align right",value:"right",children:(t,k)=>{y(t,{})},$$slots:{default:!0}}),a(o,s)},$$slots:{default:!0}})}),a(p,u)},$$slots:{default:!0}});var L=n(H,2);G(L,{label:"Disabled",children:(p,T)=>{_(p,{disabled:!0,size:"icon-sm",type:"single",value:"left",children:(u,c)=>{var l=w(),o=f(l);r(o,{"aria-label":"Align left",value:"left",children:(s,e)=>{b(s,{})},$$slots:{default:!0}});var i=n(o,2);r(i,{"aria-label":"Align right",value:"right",children:(s,e)=>{y(s,{})},$$slots:{default:!0}}),a(u,l)},$$slots:{default:!0}})},$$slots:{default:!0}}),a(V,z)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={2} minItemWidth="16rem">
	<StateGalleryItem label="Single" note="icons">
		<ToggleGroup.Root size="icon-sm" type="single" value="center">
			<ToggleGroup.Item aria-label="Align left" value="left"><AlignLeft /></ToggleGroup.Item>

			<ToggleGroup.Item aria-label="Align center" value="center"><AlignCenter /></ToggleGroup.Item
			>

			<ToggleGroup.Item aria-label="Align right" value="right"><AlignRight /></ToggleGroup.Item>
		</ToggleGroup.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Nothing pressed">
		<ToggleGroup.Root type="multiple" value={[]}>
			<ToggleGroup.Item value="tools">Tools</ToggleGroup.Item>

			<ToggleGroup.Item value="vision">Vision</ToggleGroup.Item>

			<ToggleGroup.Item value="audio">Audio</ToggleGroup.Item>
		</ToggleGroup.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Multiple" note="the unpressed keys mute">
		<ToggleGroup.Root type="multiple" value={['tools', 'vision']}>
			<ToggleGroup.Item value="tools">Tools</ToggleGroup.Item>

			<ToggleGroup.Item value="vision">Vision</ToggleGroup.Item>

			<ToggleGroup.Item value="audio">Audio</ToggleGroup.Item>
		</ToggleGroup.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Sizes" note="icon-sm, icon, icon-lg">
		<div class="flex items-center gap-3">
			{#each sizes as size (size)}
				<ToggleGroup.Root {size} type="single" value="left">
					<ToggleGroup.Item aria-label="Align left" value="left"><AlignLeft /></ToggleGroup.Item>

					<ToggleGroup.Item aria-label="Align right" value="right"
						><AlignRight /></ToggleGroup.Item
					>
				</ToggleGroup.Root>
			{/each}
		</div>
	</StateGalleryItem>

	<StateGalleryItem label="Disabled">
		<ToggleGroup.Root disabled size="icon-sm" type="single" value="left">
			<ToggleGroup.Item aria-label="Align left" value="left"><AlignLeft /></ToggleGroup.Item>

			<ToggleGroup.Item aria-label="Align right" value="right"><AlignRight /></ToggleGroup.Item>
		</ToggleGroup.Root>
	</StateGalleryItem>
</StateGallery>`}}}),W()}C.__docgen={data:[],name:"ToggleGroup.stories.svelte"};const le=O(C,X),$e=["Default"],me={...le.Default,tags:["svelte-csf-v5"]};export{me as Default,$e as __namedExportsOrder,X as default};
