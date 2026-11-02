import{p as A,f as p,s as v,a,b as g,d as C,e as i,m as B,g as l}from"./iframe-BxvSZK0j.js";import{c as T,i as N,d as W}from"./create-runtime-stories-DF7OwIoM.js";import{S as E,a as x}from"./StateGalleryItem-BMGszy9q.js";import{B as s}from"./button-xywSqPau.js";import{e as y}from"./each-DMxlN0HO.js";import{P}from"./plus-Bas3mM1L.js";import{T as M}from"./trash-BrTaTTho.js";import"./preload-helper-PPVm8Dsz.js";import"./this-PF-vsikk.js";import"./Icon-CSRBsjq8.js";import"./svelte-element-BAftWIbD.js";const O={component:s,parameters:{layout:"centered"},title:"Design system/Actions/Button"},{Story:R}=W(),j=["default","secondary","tertiary","outline","ghost","destructive"],k=["sm","default","lg"];var q=i('<div class="flex flex-wrap items-center gap-2"><!> <!> <!></div>'),F=i("<!> New chat",1),H=i("<!> Delete",1),J=i('<div class="flex flex-wrap items-center gap-2"><!> <!></div>'),K=i("<!> <!>",1);function b(S,D){A(D,!1),N(),R(S,{asChild:!0,name:"Default",children:(z,Q)=>{E(z,{columns:4,children:(G,U)=>{var _=K(),h=p(_);y(h,1,()=>j,o=>o,(o,n)=>{x(o,{get label(){return l(n)},children:(d,m)=>{var u=q(),r=g(u);y(r,1,()=>k,t=>t,(t,f)=>{s(t,{get size(){return l(f)},get variant(){return l(n)},children:($,V)=>{var I=B("Button");a($,I)},$$slots:{default:!0}})});var c=v(r,2);s(c,{"aria-label":"Add",size:"icon",get variant(){return l(n)},children:(t,f)=>{P(t,{})},$$slots:{default:!0}});var e=v(c,2);s(e,{disabled:!0,get variant(){return l(n)},children:(t,f)=>{var $=B("Disabled");a(t,$)},$$slots:{default:!0}}),a(d,u)},$$slots:{default:!0}})});var w=v(h,2);x(w,{label:"With icon",children:(o,n)=>{var d=J(),m=g(d);s(m,{children:(r,c)=>{var e=F(),t=p(e);P(t,{}),a(r,e)},$$slots:{default:!0}});var u=v(m,2);s(u,{variant:"destructive",children:(r,c)=>{var e=H(),t=p(e);M(t,{}),a(r,e)},$$slots:{default:!0}}),a(o,d)},$$slots:{default:!0}}),a(G,_)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={4}>
	{#each variants as variant (variant)}
		<StateGalleryItem label={variant}>
			<div class="flex flex-wrap items-center gap-2">
				{#each sizes as size (size)}
					<Button {size} {variant}>Button</Button>
				{/each}

				<Button aria-label="Add" size="icon" {variant}>
					<Plus />
				</Button>

				<Button disabled {variant}>Disabled</Button>
			</div>
		</StateGalleryItem>
	{/each}

	<StateGalleryItem label="With icon">
		<div class="flex flex-wrap items-center gap-2">
			<Button><Plus /> New chat</Button>

			<Button variant="destructive"><Trash2 /> Delete</Button>
		</div>
	</StateGalleryItem>
</StateGallery>`}}}),C()}b.__docgen={data:[],name:"Button.stories.svelte"};const L=T(b,O),it=["Default"],dt={...L.Default,tags:["svelte-csf-v5"]};export{dt as Default,it as __namedExportsOrder,O as default};
